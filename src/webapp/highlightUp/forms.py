from django import forms
from django.contrib.auth.models import User
from highlightUp.models import *


class NewComment(forms.Form):
    new_comment = forms.CharField()


class NominateInstructorForm(forms.Form):
    instructor_name = forms.CharField()


class UploadFileForm(forms.ModelForm):
    class Meta:
        model = File
        exclude = ['file_name', 'file_class']
        widgets = {'pdf': forms.FileInput}


class EditClassForm(forms.ModelForm):
    class Meta:
        model = Classes
        fields = '__all__'


class CreateClassForm(forms.ModelForm):
    class Meta:
        model = Classes
        exclude = ['instructors', 'students']

    def clean_class_name(self):
        class_name = self.cleanName(self.cleaned_data.get('class_name'))
        return class_name
    
    def clean_class_number(self):
        class_number = self.cleanName(self.cleaned_data.get('class_number'))
        return class_number

    def cleanName(self, text):
        invalidCharactor = ["\\", "\'", "<", ">", "\"", "\r\n", "\n", "\t", "\r",
                            "\f", "\b", "$", "(", ")", "*", "+", ".", "[", "]", "?", "^", "{", "}", "|"]
        for key in invalidCharactor:
            if text.find(key) >= 0:
                print("Please do not contain any special character in you name.")
                raise forms.ValidationError(
                    "Please do not contain any special character in you name.")
                break
        return text



class EditProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        exclude = ['user', 'email', 'follower']
        widgets = {'picture': forms.FileInput}

    def clean_first_name(self):
        first_name = self.cleanName(self.cleaned_data.get('first_name'))
        return first_name

    def clean_last_name(self):
        last_name = self.cleanName(self.cleaned_data.get('last_name'))
        return last_name

    def clean_bio(self):
        bio = self.cleanJson(self.cleaned_data.get('bio'))
        return bio

    def cleanName(self, text):
        invalidCharactor = ["\\", "\'", "<", ">", "\"", "\r\n", "\n", "\t", "\r",
                            "\f", "\b", "$", "(", ")", "*", "+", ".", "[", "]", "?", "^", "{", "}", "|"]
        for key in invalidCharactor:
            if text.find(key) >= 0:
                print("Please do not contain any special character in you name.")
                raise forms.ValidationError(
                    "Please do not contain any special character in you name.")
                break
        return text

    def cleanJson(self, text):
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


class SubmitUsernameForm(forms.Form):
    username = forms.CharField(max_length=20)

    # Customizes form validation for the username field.
    def clean_username(self):
        # Confirms that the username is not already present in the
        # User model database.
        username = self.cleaned_data.get('username')
        if not User.objects.filter(username__exact=username):
            raise forms.ValidationError("Username does not exist.")

        # We must return the cleaned data we got from the cleaned_data
        # dictionary
        return username


class ChangePasswordForm(forms.Form):
    password1 = forms.CharField(max_length=200,
                                label='Password',
                                widget=forms.PasswordInput())
    password2 = forms.CharField(max_length=200,
                                label='Confirm password',
                                widget=forms.PasswordInput())

    def clean(self):
        # Calls our parent (forms.Form) .clean function, gets a dictionary
        # of cleaned data as a result
        cleaned_data = super(ChangePasswordForm, self).clean()

        # Confirms that the two password fields match
        password1 = cleaned_data.get('password1')
        password2 = cleaned_data.get('password2')
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Passwords do not match.")

        # We must return the cleaned data we got from our parent.
        return cleaned_data


class RegistrationForm(forms.Form):
    first_name = forms.CharField(max_length=20)
    last_name = forms.CharField(max_length=20)
    email = forms.CharField(max_length=50,
                            widget=forms.EmailInput())
    username = forms.CharField(max_length=20)
    password1 = forms.CharField(max_length=200,
                                label='Password',
                                widget=forms.PasswordInput())
    password2 = forms.CharField(max_length=200,
                                label='Confirm password',
                                widget=forms.PasswordInput())

    # Customizes form validation for properties that apply to more
    # than one field.  Overrides the forms.Form.clean function.

    def clean(self):
        # Calls our parent (forms.Form) .clean function, gets a dictionary
        # of cleaned data as a result
        cleaned_data = super(RegistrationForm, self).clean()

        # Confirms that the two password fields match
        password1 = cleaned_data.get('password1')
        password2 = cleaned_data.get('password2')
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Passwords do not match.")

        # We must return the cleaned data we got from our parent.
        return cleaned_data

    # Customizes form validation for the username field.

    def clean_username(self):
        # Confirms that the username is not already present in the
        # User model database.
        username = self.cleaned_data.get('username')
        if User.objects.filter(username__exact=username):
            raise forms.ValidationError("Username is already taken.")

        # We must return the cleaned data we got from the cleaned_data
        # dictionary
        return username

    def clean_first_name(self):
        first_name = self.cleanName(self.cleaned_data.get('first_name'))
        return first_name

    def clean_last_name(self):
        last_name = self.cleanName(self.cleaned_data.get('last_name'))
        return last_name

    def cleanName(self, text):
        invalidCharactor = ["\\", "\'", "<", ">", "\"", "\r\n", "\n", "\t", "\r",
                            "\f", "\b", "$", "(", ")", "*", "+", ".", "[", "]", "?", "^", "{", "}", "|"]
        for key in invalidCharactor:
            if text.find(key) >= 0:
                print("Please do not contain any special character in you name.")
                raise forms.ValidationError(
                    "Please do not contain any special character in you name.")
                break
        return text


class AnnotationForm(forms.ModelForm):
    file_id = forms.IntegerField()

    class Meta:
        model = Annotation
        exclude = ['file', 'user', 'time', 'role']

    def clean(self):
        cleaned_data = super(AnnotationForm, self).clean()

    def clean_file_id(self):
        file_id = self.cleaned_data['file_id']
        if not File.objects.filter(id=file_id):
            raise forms.ValidationError("File does not exist.")
        return file_id
