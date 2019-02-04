from mimetypes import guess_type
from highlightUp.forms import *
from highlightUp.models import *
from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse, Http404
from django.core.exceptions import ObjectDoesNotExist
# Decorator to use built-in authentication system
from django.contrib.auth.decorators import login_required
# Use to create and manually log in a user
from django.contrib.auth.models import User
from django.contrib.auth import login, authenticate
from django.urls import reverse
from django.db import transaction
from django.core.mail import send_mail
# Used to generate a one-time-use token to verify a user's email address
from django.contrib.auth.tokens import default_token_generator
from django.http import JsonResponse
# Import time to use timestamp
import time
import json
from django.db.models import Q

def current_milli_time(): return int(round(time.time() * 1000))

def cleanJson(text):
    text = text.replace(">", "&gt;")
    text = text.replace("<", "&lt;")
    text = text.replace(" ", "&nbsp;")
    text = text.replace("\"", "&quot;")
    text = text.replace("\'", "&#39;")
    text = text.replace("\\", "\\\\")
    text = text.replace("\r\n", "<br />")
    text = text.replace("\n", "<br />")
    text = text.replace("\r", "<br />")
    text = text.replace("\t", "<br />")
    text = text.replace("\b", "<br />")
    text = text.replace("\f", "<br />")
    return text

# unvote a voted note
@login_required
@transaction.atomic
def unvote(request, annotation_id):
    context = {}
    try:
        annotation = Annotation.objects.get(id=annotation_id)
        profile = Profile.objects.get(user=request.user)
        annotation.voter.remove(profile)
        return JsonResponse({'status': 'success'})
    except:
        return JsonResponse({'status': 'fail'})

# vote a note
@login_required
@transaction.atomic
def vote(request, annotation_id):
    context = {}
    try:
        annotation = Annotation.objects.get(id=annotation_id)
        profile = Profile.objects.get(user=request.user)
        annotation.voter.add(profile)
        return JsonResponse({'status': 'success'})
    except:
        return JsonResponse({'status': 'fail'})

@login_required
@transaction.atomic
def add_comment(request, annotation_id):
    if request.method == 'GET':
        raise Http404
    context = {}
    form = NewComment(request.POST)
    # Validates the form.
    if not form.is_valid():
        return JsonResponse({"status": "fail"})
    # If the form is validate, create new comment
    annotation = get_object_or_404(Annotation, id=annotation_id)
    profile = get_object_or_404(Profile, user=request.user)
    comment = cleanJson(form.cleaned_data['new_comment'])
    role = 'Student'
    instructors = profile.instructors.all()
    if annotation.file.file_class in instructors:
        role = 'Instructor'
    new_comment = Comment(user=profile, annotation=annotation, commentText=comment, role=role)
    new_comment.save()
    context['comment'] = new_comment
    return render(request, 'highlightUp/comment.json', context, content_type='application/json')

# Allow a student to drop a class. We currently don't allow an instructor to do so
@login_required
@transaction.atomic
def drop_class(request, class_id):
    context = {}
    errors = []
    context['user'] = request.user
    context['profile'] = get_object_or_404(Profile, user=context['user'])
    context['instructors'] = context['profile'].instructors.all()
    context['students'] = context['profile'].students.all()
    context['timestamp'] = current_milli_time()
    context['class_id'] = class_id
    context['class'] = get_object_or_404(Classes, id=class_id)
    context['classes'] = Classes.objects.all()
    if (context['profile'] in context['class'].instructors.all()):
        errors.append("Instructors could not drop a class!")
        context['errors'] = errors
        return render(request, 'highlightUp/profile.html', context)
    
    context['class'].students.remove(context['profile'])
    return render(request, 'highlightUp/globalStream.html', context)

# delete a file
@login_required
@transaction.atomic
def delete_file(request, class_id, file_id):
    context = {}
    errors = []
    context['user'] = request.user
    context['profile'] = get_object_or_404(Profile, user=context['user'])
    context['instructors'] = context['profile'].instructors.all()
    context['students'] = context['profile'].students.all()
    context['timestamp'] = current_milli_time()
    context['class_id'] = class_id
    context['class'] = get_object_or_404(Classes, id=class_id)
    if (context['profile'] not in context['class'].instructors.all()):
        errors.append("Only an instructor can delete a file!")
        context['errors'] = errors
        return redirect(reverse('class_setting', kwargs={'class_id': class_id}))
    try:
        file = context['class'].file_set.get(id=file_id)
        file.delete()
    except:
        errors.append("The file does not exist!")
        context['errors'] = errors
    return redirect(reverse('class_setting', kwargs={'class_id': class_id}))

# display the class page
@login_required
def class_page(request, class_id):
    context = {}
    context['user'] = request.user
    context['profile'] = get_object_or_404(Profile, user=context['user'])
    context['instructors'] = context['profile'].instructors.all()
    context['students'] = context['profile'].students.all()
    context['timestamp'] = current_milli_time()
    context['class_id'] = class_id
    context['class'] = get_object_or_404(Classes, id=class_id)
    # Different sections of files
    context['homework'] = context['class'].file_set.filter(
        file_section='Homework')
    context['homework_sol'] = context['class'].file_set.filter(
        file_section='Homework Solution')
    context['lecture'] = context['class'].file_set.filter(
        file_section='Lecture Note')
    context['other'] = context['class'].file_set.filter(
        file_section='Other Resources')
    return render(request, 'highlightUp/class_page.html', context)


# general settings of a class
@login_required
def class_setting(request, class_id):
    context = {}
    errors = []
    context['user'] = request.user
    context['profile'] = get_object_or_404(Profile, user=context['user'])
    context['instructors'] = context['profile'].instructors.all()
    context['students'] = context['profile'].students.all()
    context['timestamp'] = current_milli_time()
    context['class_id'] = class_id
    context['class'] = get_object_or_404(Classes, id=class_id)
    context['files'] = context['class'].file_set.all()
    context['class_instructor'] = context['class'].instructors.all()
    if request.method == 'GET':
        context['setting_form'] = EditClassForm(instance=context['class'])
        context['upload_form'] = UploadFileForm()
        return render(request, 'highlightUp/class_setting.html', context)

    # change the general setting of a class
    if 'change_setting' in request.POST:
        class_form = EditClassForm(request.POST, instance=context['class'])
        if not class_form.is_valid():
            return render(request, 'highlightUp/class_setting.html', context)
        class_form.save()

    # upload a file
    if 'file_pdf' in request.FILES:
        upload_form = UploadFileForm(request.POST, request.FILES)
        if not upload_form.is_valid():
            context['errors'] = ['Fail to upload file']
            return render(request, 'highlightUp/class_setting.html', context)
        if (request.FILES['file_pdf'].name[-4:] != '.pdf'): # do not support non-pdf
            context['errors'] = ['We currently do not support file format other than pdf']
            return render(request, 'highlightUp/class_setting.html', context)
        newFile = File(file_name=request.FILES['file_pdf'].name,
                       file_section=upload_form.cleaned_data['file_section'],
                       file_class=context['class'],
                       pdf=request.FILES['file_pdf'])
        newFile.save()

    # nominage a instructor
    if 'nominate_instructor' in request.POST:
        instructor_form = NominateInstructorForm(request.POST)
        if not instructor_form.is_valid():
            return render(request, 'highlightUp/class_setting.html', context)
        if len(User.objects.filter(username=instructor_form.cleaned_data['instructor_name'])) < 1:
            errors.append("Instructor normination failed, the username does not exist.")
        else:
            instructor = User.objects.get(username=instructor_form.cleaned_data['instructor_name'])
            instructor_profile = get_object_or_404(Profile, user=instructor)
            context['class'].students.add(instructor_profile)
            context['class'].instructors.add(instructor_profile)
    context['errors'] = errors
    return render(request, 'highlightUp/class_setting.html', context)

# create a class
@login_required
def create_class(request):
    context = {}
    context['user'] = request.user
    context['profile'] = get_object_or_404(Profile, user=context['user'])
    context['instructors'] = context['profile'].instructors.all()
    context['students'] = context['profile'].students.all()
    context['timestamp'] = current_milli_time()
    if request.method == 'GET':
        context['form'] = CreateClassForm()
        return render(request, 'highlightUp/create_class.html', context)

    # POST request
    form = CreateClassForm(request.POST)
    context['form'] = form
    if not form.is_valid():
        return render(request, 'highlightUp/create_class.html', context)
    newClass = Classes(class_name=form.cleaned_data['class_name'],
                       class_number=form.cleaned_data['class_number'],
                       class_size=form.cleaned_data['class_size'],)
    newClass.save()
    newClass.instructors.add(context['profile'])
    newClass.students.add(context['profile'])
    context['instructors'] = context['profile'].instructors.all()
    context['students'] = context['profile'].students.all()
    context['timestamp'] = current_milli_time()
    context['classes'] = Classes.objects.all()
    return render(request, 'highlightUp/globalStream.html', context)


@login_required
def select_and_join_class(request, class_id):
    context = {}
    errors = []
    context['user'] = request.user
    context['profile'] = get_object_or_404(Profile, user=context['user'])
    context['instructors'] = context['profile'].instructors.all()
    context['students'] = context['profile'].students.all()
    context['classes'] = Classes.objects.all()
    context['timestamp'] = current_milli_time()
    find_class = get_object_or_404(Classes, id=class_id)
    find_class.students.add(context['profile'])
    context['students'] = context['profile'].students.all()
    return render(request, 'highlightUp/globalStream.html', context)

# Get photo of user 
@login_required
def get_photo(request, username):
    user = get_object_or_404(User, username=username)
    user_photo = get_object_or_404(Profile, user=user)
    # Probably don't need this check as form validation requires a picture be uploaded.
    if not user_photo.picture:
        raise Http404
    content_type = guess_type(user_photo.picture.name)
    return HttpResponse(user_photo.picture, content_type=content_type)

# edit profile
@login_required
def profile(request):
    context = {}
    context['user'] = request.user
    context['profile'] = get_object_or_404(Profile, user=context['user'])
    context['instructors'] = context['profile'].instructors.all()
    context['students'] = context['profile'].students.all()
    context['timestamp'] = current_milli_time()
    if request.method == 'GET':
        context['form'] = EditProfileForm(instance=context['profile'])
        return render(request, 'highlightUp/profile.html', context)

    # Post request
    profile_form = EditProfileForm(request.POST, request.FILES, instance=context['profile'])
    # Check if any area is not updated
    context['form'] = profile_form
    if not profile_form.is_valid():
        context['form'] = profile_form
        return render(request, 'highlightUp/profile.html', context)
    profile_form.save()
    return render(request, 'highlightUp/profile.html', context)

# Get all the classes out
@login_required
def globalStream(request):
    context = {}
    context['user'] = request.user
    context['profile'] = get_object_or_404(Profile, user=context['user'])
    context['instructors'] = context['profile'].instructors.all()
    context['students'] = context['profile'].students.all()
    context['classes'] = Classes.objects.all()
    context['timestamp'] = current_milli_time()
    return render(request, 'highlightUp/globalStream.html', context)

#User registration
@transaction.atomic
def register(request):
    context = {}
    # Just display the registration form if it is a GET request
    if request.method == 'GET':
        context['form'] = RegistrationForm()
        return render(request, 'highlightUp/register.html', context)

    form = RegistrationForm(request.POST)
    context['form'] = form
    # Validates the form.
    if not form.is_valid():
        return render(request, 'highlightUp/register.html', {'form': form})

    newUser = User.objects.create_user(username=form.cleaned_data['username'],
                                       password=form.cleaned_data['password1'],
                                       email=form.cleaned_data['email'],
                                       first_name=form.cleaned_data['first_name'],
                                       last_name=form.cleaned_data['last_name'])
    newUser.is_active = False
    newUser.save()
    context['user'] = newUser
    token = default_token_generator.make_token(newUser)
    email_body = '''
    Dear user, 

    Welcome to the HighlightUp application! Please click the link below to verify your email address:
    http://{host}{path}

    You have to use the link in the email to activate your account and finish the registration process. Otherwise, you could not login.

    The link would expire after one click.
    
    Thank you for choosing highlightUp! 

    Best,
    HighlightUp Team
    '''.format(host=request.get_host(), path=reverse('confirm_registration', args=(newUser.username, token)))
    send_mail(subject="Verify your email address",
              message=email_body,
              from_email="highlightUp@andrew.cmu.edu",
              recipient_list=[newUser.email])
    return render(request, 'highlightUp/needs_confirmation.html', context)


def needs_confirmation(request):
    context = {}
    context['user'] = request.user
    context['email'] = request.email
    return render(request, 'needs_confirmation', context)

def reset_password(request):
    context = {}
    context['user'] = request.user
    context['email'] = request.email
    return render(request, 'reset_password', context)

@transaction.atomic
def confirm_registration(request, username, token):
    # Login the new user and redirects to his/her globalStream
    user = get_object_or_404(User, username=username)

    # Send 404 error if token is invalid
    if not default_token_generator.check_token(user, token):
        raise Http404

    # Otherwise token was valid, activate the user.
    user.is_active = True
    user.save()

    userProfile = Profile(user=user,
                          first_name=user.first_name,
                          last_name=user.last_name,
                          email=user.email)
    userProfile.save()

    login(request, user)
    return redirect(reverse('globalStream'))

@transaction.atomic
def confirm_reset_password(request, username, token):
    context = {}
    user = get_object_or_404(User, username=username)
    # Send 404 error if token is invalid
    if not default_token_generator.check_token(user, token):
        raise Http404
    # Otherwise token was valid, redirect the user.
    context['username'] = username
    return render(request, 'highlightUp/new_password.html', context)

def new_password(request):
    context = {}
    # If there is no username specified, used the login username
    if not 'username' in request.POST or not request.POST['username']:
        user = request.user
    else:
        user = get_object_or_404(User, username=request.POST['username'])
    # Just display the registration form if it is a GET request
    if request.method == 'GET':
        context['form'] = ChangePasswordForm()
        return render(request, 'highlightUp/new_password.html', context)
    # change password
    form = ChangePasswordForm(request.POST)
    context['form'] = form
    # Validates the form.
    if not form.is_valid():
        return render(request, 'highlightUp/new_password.html', context)
    user.set_password(form.cleaned_data['password1'])
    user.save()
    login(request, user)
    return redirect(reverse('globalStream'))


@transaction.atomic
def forget_password(request):
    context = {}
    # Just display the registration form if it is a GET request
    if request.method == 'GET':
        context['form'] = SubmitUsernameForm()
        return render(request, 'highlightUp/forget_password.html', context)

    form = SubmitUsernameForm(request.POST)
    context['form'] = form
    # Validates the form.
    if not form.is_valid():
        return render(request, 'highlightUp/forget_password.html', {'form': form})
    user = get_object_or_404(User, username=form.cleaned_data['username'])
    token = default_token_generator.make_token(user)
    context['user'] = user
    context['email'] = user.email
    email_body = '''
    Dear user, 

    Welcome to the HighlightUp application! Please click the link below to verify your email address:
    http://{host}{path}

    The link would expire after one click.

    You cannot change your password if your account is not activated. Please make sure you have confirmed your email and finish the registration process before reseting your password.
    
    Thank you for choosing highlightUp! 

    Best,
    HighlightUp Team
    '''.format(host=request.get_host(), path=reverse('confirm_reset_password', args=(user.username, token)))
    send_mail(subject="Reset Your Password of HighlightUp Account",
              message=email_body,
              from_email="highlightUp@andrew.cmu.edu",
              recipient_list=[user.email])
    return render(request, 'highlightUp/reset_password.html', context)

# view pdf page
@login_required
def view_pdf(request, file_id):
    context = {}
    context['file'] = get_object_or_404(File, id=file_id)
    context['user'] = request.user
    context['profile'] = get_object_or_404(Profile, user=context['user'])
    context['instructors'] = context['profile'].instructors.all()
    context['students'] = context['profile'].students.all()
    context['timestamp'] = current_milli_time()
    return render(request, "highlightUp/view_pdf.html", context)

# serve pdf file
@login_required
def serve_pdf(request, file_id):
    file = get_object_or_404(File, id=file_id)
    if not file.pdf:
        raise Http404
    content_type = guess_type(file.pdf.name)
    return HttpResponse(file.pdf, content_type=content_type)

# Add annotation
@login_required
@transaction.atomic
def add_annotation(request):
    if (request.method == 'GET'):
        raise Http404
    context = {}
    form = AnnotationForm(request.POST)
    if form.is_valid():
        try: 
            inp = request.POST.getlist('highlight')
        except:
            raise Http404
        annotation = form.save(commit=False)
        annotation.user = request.user.profile
        file = get_object_or_404(File, id=form.cleaned_data['file_id'])
        text = cleanJson(form.cleaned_data['text'])
        annotation.text = text
        annotation.file = file
        annotation.role = 'Student'
        instructors = annotation.user.instructors.all()
        if file.file_class in instructors:
            annotation.role = 'Instructor'
        annotation.save()
        context['annotation'] = annotation
        # add highlights
        for hl in inp:
            try:
                hl = json.loads(hl)
                highlight = Highlight(annotation=annotation, x=float(hl['x']), y=float(hl['y']),\
                 width=float(hl['width']), height=float(hl['height']), page=int(hl['name'][0]))
                highlight.save()
            except:
                return JsonResponse({})
        return render(request, 'highlightUp/annotation.json', context, content_type='application/json')

    return JsonResponse({})

# get all annotations
@login_required
@transaction.atomic
def get_annotation(request):
    if (request.method == 'POST'):
        raise Http404
    try:
        file = File.objects.get(id=request.GET['pdf'])
    except:
        raise Http404
    annotations = Annotation.objects.filter(file=file)
    annotations = annotations.filter(Q(user=request.user.profile) | Q(publicity='public'))
    context = {}
    context['annotations'] = annotations
    context['timestamp'] = current_milli_time()
    return render(request, 'highlightUp/annotations.json', context, content_type='application/json')

@login_required
@transaction.atomic
def delete_note(request, note_id):
    if (request.method == 'GET'): # do not serve GET request
        raise Http404
    try:
        note = Annotation.objects.get(id=note_id)
        if note.user != request.user.profile:
            return JsonResponse({'status': 'fail'})
        note.delete()
        return JsonResponse({'status': 'success'})
    except:
        return JsonResponse({'status': 'fail'})
