from django.db import models
from django.contrib.auth.models import User
from django.utils.timezone import make_aware
import datetime

# User class for built-in authentication model


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    picture = models.ImageField(
        upload_to="user_images", blank=True, default="user_images/default.png")
    email = models.EmailField()
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    # This are for future development
    bio = models.CharField(
        max_length=420, default="Have a good day!", blank=True)
    follower = models.ManyToManyField(
        User, related_name="follower", symmetrical=False, blank=True)

    def __str__(self):
        return self.first_name + " " + self.last_name


class Classes(models.Model):
    class_name = models.CharField(max_length=400)
    class_number = models.CharField(max_length=400, unique=True)
    class_size = models.IntegerField(default="100", blank=True)
    # This is for future development
    # class_term = models.CharField( max_length=400)
    instructors = models.ManyToManyField(
        Profile, related_name="instructors", symmetrical=False)
    students = models.ManyToManyField(
        Profile, related_name="students", symmetrical=False)

    def __str__(self):
        return self.class_name


class File(models.Model):
    file_name = models.CharField(max_length=400)
    file_section = models.CharField(max_length=400)
    # file_date = models.DateTimeField(blank = True)
    file_class = models.ForeignKey(Classes, models.CASCADE)
    pdf = models.FileField(upload_to="class_pdf", blank=True)

    def __str__(self):
        return self.file_name


class Annotation(models.Model):
    file = models.ForeignKey(File, on_delete=models.CASCADE)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE)
    role = models.CharField(max_length=10)  # either instructor or student
    publicity = models.CharField(max_length=8)  # either private or public
    anno_type = models.CharField(max_length=10)  # either note or question
    text = models.CharField(max_length=10000)
    page = models.IntegerField()
    x = models.FloatField(default=-1, blank=True)
    y = models.FloatField(default=-1, blank=True)
    time = models.DateTimeField(auto_now_add=True)
    voter = models.ManyToManyField(Profile, related_name="voter", symmetrical=False, blank = True)

    def __str__(self):
        return self.text

class Highlight(models.Model):
    annotation = models.ForeignKey(Annotation, on_delete=models.CASCADE)
    x = models.FloatField()
    y = models.FloatField()
    width = models.FloatField()
    height = models.FloatField()
    page = models.IntegerField()

    def __str__(self):
        return self.x + ' ' +  self.y


class Comment(models.Model):
    user = models.ForeignKey(Profile, models.CASCADE)
    role = models.CharField(max_length=10)  # either instructor or student
    annotation = models.ForeignKey(Annotation, models.CASCADE)
    commentText = models.CharField(max_length=10000)
    dateTime = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.commentText
