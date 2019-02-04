# Inspiration
We observed that:

- Most students would frequently highlight important sentences in lecture notes and homework write-up so that they won’t miss important points.
- Sometimes, instructors also want to highlight important knowledge points or instructions in homework write-up for students so that students could pay enough attention to. But there isn’t a really efficient way.
- Students often can learn better when they study in groups and have in-depth discussions on course material. 

Thus, we want to build a website where people can share their notes about reading materials.


# Citation

- Bootstrap framework is used in grumblr. Several templates were used in this homework, including:
  - the sign-in page: https://getbootstrap.com/docs/4.1/examples/sign-in/
  - a starter-template: https://getbootstrap.com/docs/4.1/examples/starter-template/
  - For more on this framework, please check: https://getbootstrap.com/

- Django framework is used in this web. For more information, please check: https://www.djangoproject.com

- Jquery v3.1.1 is used. For more information, please check: https://jquery.com/
- JCanvas v21.0.1 is used to draw annotation on canvas. For more information, please check: https://projects.calebevans.me/jcanvas/
- PDF.js is used. For more information, please check: https://mozilla.github.io/pdf.js/

- This webapp has been deployed to Heroku: https://highlightup.herokuapp.com/

# Instruction

**Note that the source code is a version without settings for deployment. We intentionally to do so for easier examination of code at local server. Except for the setting files, this version is exactly the same as the deployed version. **

- On **login** page, you should input the username and its related password. If the username and password are correct, click *Login* button to jump to **globalStream** page.If you don't have an account, click *Register* to jump to **register** page. For your convenience, you could use "username: chaoyinw", "password: 12345" or "username: mengxinz", "password: 12345" for test.
- On **register** page, you should input all the field to register an account. You password and confirmed password **must** match. Your username **must** be unique. click *Register* button, if your information is valid, an *email* will be sent to your email address, and you will be lead to a page telling you that the email is sent. After you click the confirmation link in the email, you will be redirect to **globalStream** page.
    - If you already have an account, click *Login* to jump to **login** page.
    - If you forget your password, click *Foget Password*, submit your username, and a link will be sent to your email address. You can use that email address to create your new password. After the new password is valid, you will lbe redirect to the **globalStream** page.
- On **globalStream** page
    - Click **username** in the navbar to load the dropdown.
        - Click the **Account Setting** to jump to **profile** page of the logged in user to edit his/her profile. 
        - Click **Logout** to jump to **login** page.
    - If you don't have any class, you could follow the instructions to **join a class** or **create new class**
    - If you joined any class, you could click the **Class** in the navbar to load the dropdown of all classes, click the **class name** to redirect to related **class page**
    - If you are the instructor of anyclass, you could click the **Manage Class** in the navbar to load the dropdown of all classes, click the **class name** to redirect to related **class setting**
- On **profile** page, you could edit your profile here and drop the class you joined. However, if you're an instructor of a class, you could not drop the class.
- On **class_page** page, you could navigate through all the files in a class. You could click each files to link to the pdf viewer page
- On **class_setting** page, the instructor could change the class profile, upload new files, and delete uploaded files. An instuctor could also nominate others as new instructors
- On **view pdf** page, you can see pdf displayed with a notation bar on the right hand side.
  - Click *Add comment* will put you in a comment mode, where you can add a comment icon to anywhere inside the file. At a same time, a form to add a comment would show up and you may make a note. You may click *cancel edit* to recall this event.
  - Click *Add highlight* will put you in a highlight mode, where you can add a highlight to the text in the file. At a same time, a form to add an annotation would show up. You may click *cancel edit* to recall this event.
  - A note could be a *note* or a *question*, you must choose a type before you post the annotation.
  - You could vote on the good annotations by clicking *Like* button and unvote by clicking *unlike* button.
  - You could also comment on each annotation. The comment of an instructor always stay higher than a student's.
  - Click a comment icon will make the annotation bar scroll to the corresponding note, which will be focused with a blue background color.
  - Click any note in the annotation bar will scroll the file to the corresponding **page** (not specific icon or highlight).
  - A file will be displayed along with all existing notes, comment icons and highlights.
  - You could fliter on annotations to tailor the display of a file.  