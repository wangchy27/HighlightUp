"""highlightUp URL Configuration
"""
from django.urls import path
import django.contrib.auth.views as auth_views
import highlightUp.views

urlpatterns = [
    path('', highlightUp.views.globalStream, name= 'globalStream'),
    path('profile',highlightUp.views.profile, name='profile'),
    # Route for built-in authentication with our own custom login page
    path('login', auth_views.LoginView.as_view(template_name='highlightUp/logIn.html'), name = 'login'),
    # Route to logout a user and send them back to the login page
    path('logout',auth_views.logout_then_login, name = 'logout'),
    path('register',highlightUp.views.register, name = 'register'),
    path('photo/<str:username>',highlightUp.views.get_photo,name = 'photo'),
    path('confirm_registration/<str:username>/<str:token>',highlightUp.views.confirm_registration, name = 'confirm_registration'),
    path('needs_confirmation',highlightUp.views.needs_confirmation,name = 'needs_confirmation'),
    path('reset_password',highlightUp.views.reset_password,name = 'reset_password'),
    path('confirm_reset_password/<str:username>/<str:token>',highlightUp.views.confirm_reset_password, name = 'confirm_reset_password'),
    path('new_password',highlightUp.views.new_password,name = 'new_password'),
    path('forget_password',highlightUp.views.forget_password,name = 'forget_password'),
    path('create_class', highlightUp.views.create_class, name = 'create_class'),
    path('class_setting/<int:class_id>', highlightUp.views.class_setting, name = 'class_setting'),
    path('view-pdf/<int:file_id>', highlightUp.views.view_pdf, name = 'view_pdf'),
    path('serve-pdf/<int:file_id>', highlightUp.views.serve_pdf, name = 'serve_pdf'),
    path('class_page/<int:class_id>',highlightUp.views.class_page, name = 'class_page'), 
    path('delete_file/<int:class_id>/<int:file_id>',highlightUp.views.delete_file, name = 'delete_file'),
    path('drop_class/<int:class_id>',highlightUp.views.drop_class, name = 'drop_class'),
    path('add_annotation', highlightUp.views.add_annotation, name = 'add_annotation'),
    path('get_annotation', highlightUp.views.get_annotation, name = 'get_annotation'),
    path('select_and_join_class/<int:class_id>', highlightUp.views.select_and_join_class, name = 'select_and_join_class'),
    path('add_comment/<int:annotation_id>', highlightUp.views.add_comment, name = 'add_comment'),
    path('delete_note/<int:note_id>', highlightUp.views.delete_note, name = 'delete_note'),
    path('vote/<str:annotation_id>',highlightUp.views.vote, name = 'vote'),
    path('unvote/<str:annotation_id>',highlightUp.views.unvote, name = 'unvote'),
]