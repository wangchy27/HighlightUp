var COMMENT_MODE = false;
var HIGHLIGHT_MODE = false;
var NOTE_MODE = false;
var QUESTION_MODE = false;
var RESOLUTION = 2.5;
var SCALE = 1.0;


$(document).ready(function () { // Runs when the document is ready

  var csrftoken = getCookie('csrftoken');

  $.ajaxSetup({
    beforeSend: function (xhr, settings) {
      if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
        xhr.setRequestHeader("X-CSRFToken", csrftoken);
      }
    }
  });

  var url = $('#pdf-URL').val();
  PDFJS.getDocument(url)
    .then(function (pdf) {

      // Get div#container and cache it for later use
      var container = document.getElementById("pdf-container");

      // Loop from 1 to total_number_of_pages in PDF document
      for (var i = 1; i <= pdf.numPages; i++) {
        // Get desired page
        pdf.getPage(i).then(function (page) {
          var windowWidth = $('.pdf-viewer')[0].scrollWidth;
          var trueWidth = page.getViewport(RESOLUTION).width / RESOLUTION;
          SCALE = Math.max(windowWidth / trueWidth, 1.0);
          var viewport = page.getViewport(RESOLUTION * SCALE);

          // Create a new Canvas element
          var div = document.createElement("div");
          div.setAttribute("id", "page-" + (page.pageIndex + 1));
          container.append(div)
          div.setAttribute("style", "position: relative");

          var canvas = document.createElement("canvas");
          var anno = document.createElement("canvas");

          // Append Canvas within div#page-#{pdf_page_number}
          div.appendChild(canvas);
          div.appendChild(anno);
          anno.setAttribute("id", "anno-" + (page.pageIndex + 1));
          anno.classList.add("annotation-layer");
          canvas.classList.add("pdf-layer");

          //display pdf
          var context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.height = viewport.height / RESOLUTION + "px";
          canvas.style.width = viewport.width / RESOLUTION + "px";
          anno.width = viewport.width;
          anno.height = viewport.height;
          anno.style.height = viewport.height / RESOLUTION + "px";
          anno.style.width = viewport.width / RESOLUTION + "px";
          div.style.height = viewport.height / RESOLUTION + "px";
          div.style.width = viewport.width / RESOLUTION + "px";

          // Prepare object needed by render method
          var renderContext = {
            canvasContext: context,
            viewport: viewport,
          };

          // Render PDF page
          page.render(renderContext)
            .then(function () {
              // Get text-fragments
              return page.getTextContent();
            })
            .then(function (textContent) {
              // Create div which will hold text-fragments
              var textLayerDiv = document.createElement("div");

              // Set it's class to textLayer which have required CSS styles
              textLayerDiv.setAttribute("class", "textLayer");
              textLayerDiv.setAttribute("id", "text-" + (page.pageIndex + 1));

              // Append newly created div in `div#page-#{pdf_page_number}`
              div.appendChild(textLayerDiv);

              // Create new instance of TextLayerBuilder class
              var textLayer = new TextLayerBuilder({
                textLayerDiv: textLayerDiv,
                pageIndex: page.pageIndex,
                viewport: page.getViewport(SCALE)
              });

              // Set text-fragments
              textLayer.setTextContent(textContent);

              // Render text-fragments
              textLayer.render();
            });
        });
      }
    }).then(loadAnnotations);
});

$('#filter-bar').on('show.bs.collapse', function () {
  $('.notation-bar-wrapper').css('height', 'calc(100vh - 264px)');
})

$('#filter-bar').on('hide.bs.collapse', function () {
  $('.notation-bar-wrapper').css('height', 'calc(100vh - 138px)');
})

//Add an annotation upon mouse click
$('#pdf-container').on('click', 'canvas', addAnnotation);

// show all notes
$('#setNoteMode').on('click', function(){
  NOTE_MODE = true;
  QUESTION_MODE = false;
  setFilter();
});

// show all notes
$('#setQuestionMode').on('click', function(){
  NOTE_MODE = false;
  QUESTION_MODE = true;
  setFilter();
});

// Add a highlight annotation in highlight mode
$('#pdf-container').on('mouseup', '.textLayer', function (e) {
  var selection = window.getSelection();
  var canvas = $(this).siblings('.annotation-layer');
  var pageId = parseInt(canvas.attr('id').split('-')[1]);
  var children = $(this)[0].childNodes;
  var highlights = [];
  // don't handle no highlight or not in highlight mode
  if (!HIGHLIGHT_MODE || selection.isCollapsed) {
    return;
  }
  // Cannot handle two annotation simultanously on the same page
  if (canvas.getLayerGroup(pageId + '-layer') != null) {
    alert('If you try to see other note while editing, please quit the comment mode by clicking "Add comment" button.' +
      '\n' + 'If you try to add another note, please finish your last edit on this page first.');
    return;
  }
  // check each children whether it is in selection. If so, handle it
  for (var i = 0; i < children.length; i++) {
    if (selection.containsNode(children[i], false)) { // contain the full node
      if ($(children[i]).html() == '') { // don't handle zerospace div
        continue;
      }
      var top = $(children[i]).position().top;
      var left = $(children[i]).position().left;
      var ratio;
      if ($(children[i]).css('transform') == 'none') {
        ratio = 1.0;
      } else {
        ratio = $(children[i]).css('transform').split('(')[1].split(',')[0];
      }
      var rect = {
        x: left / SCALE,
        y: top / SCALE,
        width: children[i].offsetWidth * ratio / SCALE,
        height: children[i].offsetHeight * ratio / SCALE,
        name: pageId + '-layer'
      };
      highlights.push(rect);
      drawHighlight(rect, canvas);
    } else if (selection.containsNode(children[i], true)) {
      // start == end
      if (selection.anchorNode.parentNode == selection.extentNode.parentNode) {
        var front = Math.min(selection.anchorOffset, selection.extentOffset);
        var back = Math.max(selection.anchorOffset, selection.extentOffset);
        var substrFront = children[i].innerHTML.substring(0, front);
        var substrMid = children[i].innerHTML.substring(front, back);
        var substrBack = children[i].innerHTML.substring(back);
        var wrapper = document.createElement('span');
        wrapper.innerHTML = substrMid;
        wrapper = $(wrapper);
        children[i].innerHTML = '';
        $(children[i]).append(substrFront);
        $(children[i]).append(wrapper);
        $(children[i]).append(substrBack);
        var top = wrapper.parent().position().top;
        var left = wrapper.parent().position().left + wrapper.position().left;
        var ratio = wrapper.parent().css('transform').split('(')[1].split(',')[0];
        var rect = {
          x: left / SCALE,
          y: top / SCALE,
          width: wrapper[0].offsetWidth * ratio / SCALE,
          height: wrapper[0].offsetHeight * ratio / SCALE,
          name: pageId + '-layer'
        };
        drawHighlight(rect, canvas);
        highlights.push(rect);
        children[i].innerHTML = substrFront + substrMid + substrBack;
      } else if (i + 1 < children.length && selection.containsNode(children[i + 1], true)) { // the front edge node
        var mid;
        if (children[i] == selection.anchorNode.parentNode) { // anchor node
          mid = selection.anchorOffset;
        } else {
          mid = selection.extentOffset;
        }
        var substrFront = children[i].innerHTML.substring(0, mid);
        var substrBack = children[i].innerHTML.substring(mid);
        var wrapper = document.createElement('span');
        wrapper.innerHTML = substrBack;
        wrapper = $(wrapper);
        children[i].innerHTML = '';
        $(children[i]).append(substrFront);
        $(children[i]).append(wrapper);
        var top = wrapper.parent().position().top;
        var left = wrapper.parent().position().left + wrapper.position().left;
        var ratio = wrapper.parent().css('transform').split('(')[1].split(',')[0];
        var rect = {
          x: left / SCALE,
          y: top / SCALE,
          width: wrapper[0].offsetWidth * ratio / SCALE,
          height: wrapper[0].offsetHeight * ratio / SCALE,
          name: pageId + '-layer'
        };
        drawHighlight(rect, canvas);
        highlights.push(rect);
        children[i].innerHTML = substrFront + substrBack;
      } else { // the end edge node
        var mid;
        if (children[i] == selection.anchorNode.parentNode) { // anchor node
          mid = selection.anchorOffset;
        } else {
          mid = selection.extentOffset;
        }
        var substrFront = children[i].innerHTML.substring(0, mid);
        var substrBack = children[i].innerHTML.substring(mid);
        var wrapper = document.createElement('span');
        wrapper.innerHTML = substrFront;
        wrapper = $(wrapper);
        children[i].innerHTML = '';
        $(children[i]).append(wrapper);
        $(children[i]).append(substrBack);
        var canvas = $(this).siblings('.annotation-layer');
        var top = wrapper.parent().position().top;
        var left = wrapper.parent().position().left + wrapper.position().left;
        var ratio = wrapper.parent().css('transform').split('(')[1].split(',')[0];
        var rect = {
          x: left / SCALE,
          y: top / SCALE,
          width: wrapper[0].offsetWidth * ratio / SCALE,
          height: wrapper[0].offsetHeight * ratio / SCALE,
          name: pageId + '-layer'
        };
        drawHighlight(rect, canvas);
        highlights.push(rect);
        children[i].innerHTML = substrFront + substrBack;
      }
    }
  }
  var pdfId = $("#pdf-id").val();
  var noteForm = $('<form method="post" id="form-' + pageId + '" class="note-form"><label for="postInput" class="font-weight-bold postInputTag">Add a note to page' +
    pageId + ':</label><textarea class="form-control border-info" id="postInput" rows="5" name="text"></textarea><div>\
      <p class="d-inline-block font-weight-bold form-group-label">Publicity: </p>\
      <div class="form-check form-check-inline"><input class="form-check-input" type="radio" name="publicity" id="public-note" value="public" checked="checked">\
      <label class="form-check-label" for="public-note">Public</label></div><div class="form-check form-check-inline">\
      <input class="form-check-input" type="radio" name="publicity" id="private-note" value="private">\
      <label class="form-check-label" for="private-note">Private</label></div></div><div>\
      <p class="d-inline-block font-weight-bold form-group-label">Type:</p><div class="form-check form-check-inline">\
      <input class="form-check-input" type="radio" name="anno_type" id="note-post" value="note">\
      <label class="form-check-label" for="note-post">Note (doesn\'t need an answer)</label></div><div class="form-check form-check-inline">\
      <input class="form-check-input" type="radio" name="anno_type" id="qa-post" value="question">\
      <label class="form-check-label" for="qa-post">Question</label></div></div><a href="#" class="cancle-edit"> Cancle edit</a>\
      <button type="submit" class="btn btn-block post-button">Submit</button><input type="hidden" name="page" value=' + pageId + '>\
      <input type="hidden" name="file_id" value=' + pdfId + '></form>');
  $("#notation-bar").prepend(noteForm);
  for (var i = 0; i < highlights.length; i++) {
    noteForm.append('<input type="hidden" name="highlight" value=' + JSON.stringify(highlights[i]) + '>');
  }
  $('.notation-bar-wrapper').animate({
    scrollTop: 0
  }, 500);
});

// Cancle editing an note
$('#notation-bar').on("click", ".cancle-edit", function (event) {
  event.preventDefault(); // Prevent
  var form = $(this).parent();
  var pageId = form.attr('id').split('-')[1];
  var canvas = $('#pdf-container').find('#anno-' + pageId);
  canvas.removeLayerGroup(pageId + '-layer').drawLayers();
  form.remove();
});

// delete the note upon click
$('#notation-bar').on("click", "#delete-note", function (event) {
  var note = $(this).closest('.note');
  var id = note.attr('id').split('-')[1];
  var confir = confirm("Are you sure to delete that note/question?");
  if (confir == true) {
    $.ajax({
      url: "/highlightUp/delete_note/" + id,
      dataType: 'json',
      type: "POST",
      data: {},
      success: function (data) {
        if (data.status == 'success') {
          var page = parseInt(note.find('input[name=page]').val());
          var canvas = $("#anno-" + page);
          canvas.removeLayerGroup(note.attr('id')).drawLayers();
          note.remove();
        } else {
          alert("Fail to delete note/question!");
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        alert(textStatus);
        alert(errorThrown);
      }
    });
  } else {
    return;
  }
});

// vote for the note
$('#notation-bar').on("click", "#vote", function (event) {
  var note = $(this).closest('.note');
  var id = note.attr('id').split('-')[1];
  var button = $(this);
  var voteNum = parseInt(note.children('#voteNum').val());
  $.ajax({
    url: "/highlightUp/vote/" + id,
    dataType: 'json',
    type: "POST",
    data: {},
    success: function (data) {
      if (data.status == 'success') {
        voteNum = voteNum + 1;
        note.children('#voteNum').val(voteNum);
        button.html("&#9733; Unlike ("+ voteNum +")");
        button.attr("id", "unvote");
        note.find('input[name=vote]').val('True');
      } else {
        alert("Fail to vote for the note/question!");
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      alert(textStatus);
      alert(errorThrown);
    }
  });
});

// unvote for the note
$('#notation-bar').on("click", "#unvote", function (event) {
  var note = $(this).closest('.note');
  var id = note.attr('id').split('-')[1];
  var button = $(this);
  var voteNum = parseInt(note.children('#voteNum').val());
  $.ajax({
    url: "/highlightUp/unvote/" + id,
    dataType: 'json',
    type: "POST",
    data: {},
    success: function (data) {
      if (data.status == 'success') {
        voteNum = voteNum - 1;
        note.children('#voteNum').val(voteNum);
        button.html("&#9734; Like ("+ voteNum +")");
        button.attr("id", "vote");
        note.find('input[name=vote]').val('False');
      } else {
        alert("Fail to unvote for the note/question!");
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      alert(textStatus);
      alert(errorThrown);
    }
  });
});

// set the comment mode
$('#setCommentMode').on('click', function () {
  COMMENT_MODE = !COMMENT_MODE;
  if (COMMENT_MODE) {
    $('.annotation-layer').css('z-index', 4);
    if (HIGHLIGHT_MODE == true) {
      HIGHLIGHT_MODE = false;
      // change the zIndex of text layer and annotation layer
      $('#setHighlightMode').removeClass('activeButton');
    }
    $(this).addClass('activeButton');
  } else {
    $('.annotation-layer').css('z-index', 2);
    $(this).removeClass('activeButton');
  }
});

// set the highlight mode
$('#setHighlightMode').on('click', function () {
  HIGHLIGHT_MODE = !HIGHLIGHT_MODE;
  if (HIGHLIGHT_MODE) {
    $('.annotation-layer').css('z-index', '2');
    if (COMMENT_MODE == true) {
      COMMENT_MODE = false;
      $('#setCommentMode').removeClass('activeButton');
    }
    $(this).addClass('activeButton');
  } else {
    $(this).removeClass('activeButton');
  }
});

// submmit an annotation
$('#notation-bar').on('submit', '.note-form', function (event) {
  event.preventDefault(); // Prevent
  var f = $(this);
  var data = $(this).serializeArray();
  $.ajax({
    url: "/highlightUp/add_annotation",
    dataType: 'json',
    type: "POST",
    data: data,
    success: function (data) {
      if (data.hasOwnProperty('text')) {
        addCard(data, true);
        $('#notation-bar').html($('#notation-bar .note').sort(sortNotes));
        f.remove();
      } else {
        alert("Fail to add note/question!\nDo you remember to choose the annotation type as note/question?");
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      alert(textStatus);
      alert(errorThrown);
    }
  });
});

//Project the event on text layer to annotation layer
$('#pdf-container').on('click', '.textLayer', function (event) {
  event.preventDefault();
  if (event.isTrigger) {
    return;
  }
  var pageId = $(this).attr('id').split('-')[1];
  var canvas = $('#anno-' + pageId);
  var x = (event.pageX - canvas.offset().left);
  var y = (event.pageY - canvas.offset().top);
  var e = new jQuery.Event("click");
  e.offsetX = x * RESOLUTION;
  e.offsetY = y * RESOLUTION;
  canvas.trigger(e);
});

// Detect the event of changing filter bar
$('#filter-bar').change(setFilter);

// using jQuery
// https://docs.djangoproject.com/en/1.10/ref/csrf/
function getCookie(name) {
  var cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = jQuery.trim(cookies[i]);
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function csrfSafeMethod(method) {
  // these HTTP methods do not require CSRF protection
  return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

function drawHighlight(rect, canvas) {
  canvas.drawRect({
    layer: true,
    groups: [rect.name],
    fillStyle: 'rgba(26, 216, 207, 0.3)',
    x: rect.x * SCALE * RESOLUTION,
    y: rect.y * SCALE * RESOLUTION,
    width: rect.width * SCALE * RESOLUTION,
    height: rect.height * SCALE * RESOLUTION,
    fromCenter: false,
    click: function (layer) {
      return clickLayer(layer);
    }
  }).drawLayers();
}

//draw all highlights in an annotation
function drawHighlights(data) {
  var canvas = $('#anno-' + data.page);
  for (var i = 0; i < data.highlights.length; i++) {
    var rect = {
      x: data.highlights[i].x,
      y: data.highlights[i].y,
      width: data.highlights[i].width,
      height: data.highlights[i].height,
      name: 'note-' + data.id
    }
    drawHighlight(rect, canvas);
  }
}

//draw all annotations on canvas
function drawAnnotation(data) {
  var canvas = $('#anno-' + data.page);
  canvas.drawImage({
    layer: true,
    source: 'https://s3.amazonaws.com/highlight-up/static/icon/comment.png',
    x: data.x * RESOLUTION * SCALE,
    y: data.y * RESOLUTION * SCALE,
    groups: ['note-' + data.id],
    width: 45 * SCALE,
    height: 45 * SCALE,
    visible: false,
    click: function (layer) {
      return clickLayer(layer);
    }
  });
}

// handle the event of clicking on pdf file
function addAnnotation(e) {
  if (COMMENT_MODE) {
    var canvas = $(this);
    addNote(e, canvas); //add a note in the comment mode
    $('.notation-bar-wrapper').animate({
      scrollTop: 0
    }, 500);
  }
}

// the function to add a note form
function addNote(e, canvas) {
  var pageId = parseInt(canvas.attr('id').split('-')[1]);
  if (canvas.getLayerGroup(pageId + '-layer') != null) {
    alert('If you try to see other note while editing, please quit the comment mode by clicking "Add comment" button.' +
      '\n' + 'If you try to add another note, please finish your last edit on this page first.');
    return;
  }
  var x = e.pageX - canvas.offset().left;
  var y = e.pageY - canvas.offset().top;
  canvas.drawImage({
    layer: true,
    source: 'https://s3.amazonaws.com/highlight-up/static/icon/comment.png',
    x: x * RESOLUTION,
    y: y * RESOLUTION,
    groups: [pageId + '-layer'],
    width: 45 * SCALE,
    height: 45 * SCALE,
    click: function (layer) {
      return clickLayer(layer);
    }
  });
  var pdfId = $("#pdf-id").val();
  var noteForm = $('<form method="post" id="form-' + pageId + '" class="note-form"><label for="postInput" class="font-weight-bold postInputTag">Add a note to page' +
    pageId + ':</label><textarea class="form-control border-info" id="postInput" rows="5" name="text"></textarea><div>\
      <p class="d-inline-block font-weight-bold form-group-label">Publicity: </p>\
      <div class="form-check form-check-inline"><input class="form-check-input" type="radio" name="publicity" id="public-note" value="public" checked="checked">\
      <label class="form-check-label" for="public-note">Public</label></div><div class="form-check form-check-inline">\
      <input class="form-check-input" type="radio" name="publicity" id="private-note" value="private">\
      <label class="form-check-label" for="private-note">Private</label></div></div><div>\
      <p class="d-inline-block font-weight-bold form-group-label">Type:</p><div class="form-check form-check-inline">\
      <input class="form-check-input" type="radio" name="anno_type" id="note-post" value="note">\
      <label class="form-check-label" for="note-post">Note (doesn\'t need an answer)</label></div><div class="form-check form-check-inline">\
      <input class="form-check-input" type="radio" name="anno_type" id="qa-post" value="question">\
      <label class="form-check-label" for="qa-post">Question</label></div></div><a href="#" class="cancle-edit"> Cancle edit</a>\
      <button type="submit" class="btn btn-block post-button">Submit</button><input type="hidden" name="page" value=' + pageId + '>\
      <input type="hidden" name="x" value=' + x / SCALE + '><input type="hidden" name="y" value=' + y / SCALE + '><input type="hidden" name="file_id" value=' + pdfId + '></form>');
  $("#notation-bar").prepend(noteForm);
}

// Add a note card 
function addCard(data, active) {
  var comment;
  //the card of a note
  if (data.type == "note") {
    comment = "Comment"
  } else {
    comment = "Answer"
  }
  var note = $('<div class="card note" id="note-' + data.id + '"><div class="card-body"><p class="text-muted">Page' + data.page + '</p>\
    <a class="font-weight-bold user-role"><img src="' + data.picture + '" alt=' + data.username + ' class="rounded-circle mr-1" width=30; height=30;>\
    ' + data.username + '</a><p class="my-2">' + data.text + '</p><p class="text-muted timetag">' + data.time + '</p>' + deleteNoteLink(data) + '</div>\
    <div class=" vote card-body"> ' + voteButton(data) + ' </div>\
    <input type="hidden" name="page" id="page" value="' + data.page + '">\
    <input type="hidden" name="type"  id="type" value="' + data.type + '">\
    <input type="hidden" name="role"  id="role" value="' + data.role + '">\
    <input type="hidden" name="isSelf"  id="isSelf" value="' + data.canDelete + '">\
    <input type="hidden" name="publicity"  id="publicity" value="' + data.publicity + '">\
    <input type="hidden" name="vote" id="vote_hidden" value="' + data.vote + '">\
    <input type="hidden" name="voteNum" id="voteNum" value=' + data.voteNum + '>\
    <div class="comment-form"></div>\
    <a class="expand-comment text-center hidden" data-toggle="collapse" href="#comments' + data.id + '"\
     aria-expanded="false" aria-controls="comments"><div class="line"><span class="txt px-1">View ' + comment + 's &#8711;</span></div></a>\
    <div class="collapse bg-light" id="comments' + data.id + '">\
    <div class="instructor"></div>\
    <div class="student"></div></div></div>');

  // Comment form
  var addComment = $('<form action="' + data.addComment + '" method="post" class="mx-1" id="comment_form">\
                      <input type="hidden" class="annotation_id" value="' + data.id + '">\
                      <input type="hidden" class="role" name="role" value="' + data.role + '">\
                      <div class="mb-1">\
                      <textarea class="form-control" id="new_comment" name = "new_comment" rows="1" placeholder = "New ' + comment + '"></textarea></div>\
                      <button class="btn white btn-sm mb-2 darkblue-background" type="submit">' + comment + '</button></form>')

  // Add comment form to note
  $(note).children('.comment-form').append(addComment);
  // Add user-role badge
  if (data.role == "Instructor") {
    var bage = $('<span class="badge badge-pill badge-primary mx-1">V</span>')
    $(note).children('.card-body').children('.user-role').append(bage);
  }
  // Add comments to note
  var instructor = $(note).children('.collapse').children('.instructor');
  var student = $(note).children('.collapse').children('.student');

  if (data.comments.length > 0) {
    note.find('.expand-comment').removeClass('hidden');
  }

  for (var i = 0; i < data.comments.length; i++) {
    if (data.comments[i].role == 'Instructor') {
      addComments(instructor, data.comments[i]);
    } else {
      addComments(student, data.comments[i]);
    }
  }
  // Append note to annotation bar
  $('#notation-bar').append(note);
  if (active) {
    resetFilter();
    if (data.type == 'question') {
      NOTE_MODE = false;
      QUESTION_MODE = true;
      setFilter();
    } else {
      NOTE_MODE = true;
      QUESTION_MODE = false;
      setFilter();
    }
    $('.notation-bar-wrapper').animate({
      scrollTop: note.position().top
    }, 500);
    note.addClass('active-note');
    var canvas = $('#pdf-container').find('#anno-' + data.page);
    while (canvas.getLayerGroup(data.page + '-layer')) { //bug in lib: not stable of changing group
      canvas.setLayerGroup(data.page + '-layer', {
        groups: ['note-' + data.id],
      });
    }
  }
}

// Use this to add new comment to annotation
$("#notation-bar").on("submit", "#comment_form", function (event) {
  event.preventDefault();
  var card = $(this).parent().parent();
  var instructor = $(card).children('.collapse').children('.instructor');
  var student = $(card).children('.collapse').children('.student');
  var comments = $(this);
  var annotation_id = comments.children(".annotation_id").val();
  var role = comments.children(".role").val();
  $.post('/highlightUp/add_comment/' + annotation_id, $(this).serialize())
    .done(function (data) {
      if (data.hasOwnProperty('commentText')) {
        if (role == 'Instructor') {
          addComments(instructor, data);
        } else {
          addComments(student, data);
        }
        card.find('.expand-comment').removeClass('hidden');
        if (card.find('.expand-comment').attr('aria-expanded') != 'true') {
          card.find('.expand-comment').click();
        }
      }
    });
  comments[0].reset();
});

// The following function will help you update the contents of the
// page based on our application's JSON response.
function addComments(card, comment) {

  var commentText = comment.commentText;
  var username = comment['username'];
  var picture = comment['picture'];
  var user = comment['user'];
  var role = comment['role'];
  var dateTime = comment['dateTime'];

  // Create the img
  var $img = $("<img>", {
    "class": "rounded-circle mr-1",
    src: picture,
    alt: user,
    width: "30",
    height: "30",
  });
  // Create the hyperlink of the card
  var $comment_link = $("<a/>", {
    "class": "font-weight-bold",
    style: "color:black"
  });
  $comment_link.append($img, username);
  // Add badge
  if (role == "Instructor") {
    var bage = $('<span class="badge badge-pill badge-primary mx-1">V</span>')
    $comment_link.append(bage)
  }
  // Create the header of the comment
  var $comment_header = $("<div/>", {
    "class": "my-1 mx-4",
  }).append($comment_link);
  // Create comment text
  var $comment = $('<p class="my-2">' + commentText + '</p>');
  var $dateTime = $("<small/>", {
    "class": "text-muted",
    text: dateTime,
  });
  var $dateTime_p = $("<p class='my-1'></p>").append($dateTime)
  // Create comment body
  var $comment_body = $("<div/>", {
    "class": "mx-4",
  }).append($comment, $dateTime_p);

  // Create the whole comment
  var $comment_div = $("<div/>", {
    "class": "py-1",
  }).append($comment_header, $comment_body);

  // Append comment to blog
  card.append($comment_div);
}

//sort note based on page number 
function sortNotes(a, b) {
  var startA = parseInt($(a).find('input[name=page]').val());
  var startB = parseInt($(b).find('input[name=page]').val());
  return startA - startB;
}

// scroll pdf down to right page
$('#notation-bar').on('click', '.note', function (event) {
  var page = parseInt($(this).find('input[name=page]').val());
  var canvas = $("#anno-" + page);
  $('.pdf-viewer').animate({
    scrollTop: $("#page-" + page).position().top
  }, 500);
  $('#notation-bar').children('.note').each(function () {
    $(this).removeClass('active-note');
  });
  $(this).addClass('active-note');
});

// load all annotations
function loadAnnotations() {
  $.ajax({
    url: "/highlightUp/get_annotation",
    dataType: 'json',
    type: "GET",
    data: {
      pdf: $("#pdf-id").val()
    },
    success: function (data) {
      for (var i = 0; i < data.annotations.length; i++) {
        var anno = data.annotations[i];
        addCard(anno, false);
        if (anno.x != -1) {
          drawAnnotation(anno);
        } else {
          drawHighlights(anno);
        }
      }
      NOTE_MODE = true;
      setFilter();
      $('#notation-bar').html($('#notation-bar .note').sort(sortNotes));
    },
    error: function (jqXHR, textStatus, errorThrown) {
      alert(textStatus);
      alert(errorThrown);
    }
  });
}

// Click a annotation on canvas
function clickLayer(layer) {
  if (layer.groups[0].includes('layer')) {
    $('.notation-bar-wrapper').animate({
      scrollTop: 0
    }, 500);
    $('#notation-bar').children('.note').each(function () {
      $(this).removeClass('active-note');
    });
    return;
  }
  $('.notation-bar-wrapper').animate({
    scrollTop: $('#' + layer.groups[0]).position().top
  }, 500);
  $('#notation-bar').children('.note').each(function () {
    $(this).removeClass('active-note');
  });
  $('#' + layer.groups[0]).addClass('active-note');
}

// show all notes in the pdf
function setNoteMode() {
  $('#notation-bar').children('.note').each(function () {
    if ($(this).find('input[name=type]').val() == 'question') {
      hideNote($(this));
    } else {
      showNote($(this));
    }
  });
  $('#setNoteMode').addClass('activeButton');
  $('#setQuestionMode').removeClass('activeButton');
}

// show all questions and hide all notes
function setQuestionMode() {
  $('#notation-bar').children('.note').each(function () {
    if ($(this).find('input[name=type]').val() == 'note') {
      hideNote($(this));
    } else {
      showNote($(this));
    }
  });
  $('#setNoteMode').removeClass('activeButton');
  $('#setQuestionMode').addClass('activeButton');
}

// add the edit and delete link if the note can be deleted
function deleteNoteLink(data) {
  if (data.canDelete == 'True') {
    return '<a class="font-weight-bold" id="delete-note" href="#">Delete</a>';
  }
  return "";
}

// add the vote button
function voteButton(data) {
  // Vote button
  if (data.vote == 'True') {
    return '<a role="button" class="btn btn-sm btn-warning font-weight-bold btn-vote" id ="unvote" href="#" >&#9733; Unlike ('+ data.voteNum+')</a>';
  } else {
    return '<a role="button" class="btn btn-sm btn-warning font-weight-bold btn-vote" id ="vote" href="#">&#9734; Like ('+ data.voteNum+')</a>';
  }
}

//function set filter according to notation bar 
function setFilter() {
  $('#notation-bar').children('.note').each(function () {
    $(this).removeClass('active-note');
  });
  // Add the note mode filter
  if (NOTE_MODE) {
    setNoteMode();
  } else {
    setQuestionMode();
  }
  // Add the publicity filter
  var publicity = $('#publicity-filter').val();
  if (publicity != 'All') {
    setPublicityFilter(publicity);
    if (publicity == 'Private') { // no more filter for private note
      return;
    }
  }
  // Add the voted filter
  var voted = $('#vote-filter').val();
  if (voted != 'All') {
    setVotedFilter(publicity);
  }
  // Add the user-type filter
  var userType = $('#user-filter').val();
  if (userType != 'All') {
    setUserFilter(publicity, userType);
  }
  // Add vote number filter 
  var voteNum = $('#vote-number-input').val();
  if (voteNum != 0) {
    setVoteNumFilter(publicity, voteNum);
  }
}

// hide a note
function hideNote(note) {
  var page = parseInt(note.find('input[name=page]').val());
  var canvas = $("#anno-" + page);
  note.addClass('hidden');
  canvas.setLayerGroup(note.attr('id'), {
    visible: false,
  }).drawLayers();
}

// show a note
function showNote(note) {
  var page = parseInt(note.find('input[name=page]').val());
  var canvas = $("#anno-" + page);
  note.removeClass('hidden');
  canvas.setLayerGroup(note.attr('id'), {
    visible: true,
  }).drawLayers();
}

//set the publicity filter for note
function setPublicityFilter(publicity) {
  $('#notation-bar').children('.note').each(function () {
    if ($(this).find('input[name=publicity]').val() != publicity.toLowerCase()) {
      hideNote($(this));
    }
  });
}

// set the voted filter for note, ignore the private posts
function setVotedFilter(publicity) {
  $('#notation-bar').children('.note').each(function () {
    if ($(this).find('input[name=publicity]').val() != "private" && 
      $(this).find('input[name=vote]').val() != 'True') {
      hideNote($(this));
    }
  });
}

//set the vote number filter for note, ignore the private posts
function setVoteNumFilter(publicity, voteNum) {
  if (isNaN(parseInt(voteNum))) {
    alert("You must input integer for vote number filter!");
    return;
  }
  $('#notation-bar').children('.note').each(function () {
    if ($(this).find('input[name=publicity]').val() != "private" && 
      $(this).find('input[name=voteNum]').val() < voteNum) {
      hideNote($(this));
    }
  });
}

// set the user type filter for note, ignore the private posts
function setUserFilter(publicity, userType) {
  if (userType == 'Self') { // only show self notes 
    $('#notation-bar').children('.note').each(function () {
      if ($(this).find('input[name=publicity]').val() != "private" && 
        $(this).find('input[name=isSelf]').val() != 'True') {
        hideNote($(this));
      }
    });
    return;
  }
  // student or instructor notes
  $('#notation-bar').children('.note').each(function () {
    if ($(this).find('input[name=publicity]').val() != "private" && 
      $(this).find('input[name=role]').val() != userType) {
      hideNote($(this));
    }
  });
}

//reset the filter after publishing a new note/question
function resetFilter() {
  $('#publicity-filter').val("All");
  $('#vote-filter').val("All");
  $('#user-filter').val("Self");
  $('#vote-number-input').val("0");
}
