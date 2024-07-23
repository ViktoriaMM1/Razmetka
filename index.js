var arr=[];
var TEXT_CONTAINER = [];
var words=[];
var long_sec = 10; // длина аудио которая помещается внутрь canvas
var audio = document.getElementById('audio');
var duration;
var time_s = 0, time_e = 0;


function get_audio_data() {
    return arr.map(function (number) {
        return -number;
    });
}
var norm_arr;


$.ajax({
    url: '/get_AJAX/',
    method: 'GET',
    dataType: 'json',
    success: function(response) {
        arr = response.arr;
        words=response.words;
        norm_arr = get_audio_data();
        draw_line();
        audio.addEventListener('loadedmetadata', function () {
            duration = audio.duration;
            console.log('Длительность аудио: ' + duration + ' секунд');
            time_e = duration;
            if (duration<long_sec){
                long_sec=duration;
            }
            for (let i = 0; i < words.length; i++) {
                update_text_container(words[i].start_sec, words[i].end_sec, words[i].words);
            }
        });

    }
});


const scale_y = 3;
const one_sec_points = 50;

//глобальные переменные, которые меняются при движение направо или на лево и при масштабирование
var shift_canvas = 0; //
var scale = 1;



var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
ctx.strokeStyle = "red";
ctx.lineWidth = 1;

canvas.addEventListener("mousedown", down);
canvas.addEventListener("mousemove", move);
canvas.addEventListener("mouseup", up);

function draw_line() {
    var current_long_points = shift_canvas + long_sec * one_sec_points;
    current_long_points = parseInt(current_long_points);


    var current_items = [];
    for (var i = shift_canvas; i < current_long_points && i < norm_arr.length; i++) {
        current_items.push(norm_arr[i]);
    }

    console.log("shift_canvas:", shift_canvas);

    var dx = 0.0;
    var dy = current_items[0] * scale_y + canvas.height / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(dx, dy);
    for (var i = 1; i < current_items.length; i++) {
        dx += (canvas.width / current_items.length);
        dy = current_items[i] * scale_y + canvas.height / 2;
        ctx.lineTo(parseInt(dx), dy);
    }
    ctx.stroke();
}


let start_select_second = 0, end_select_second = 0, start1;
var isDrawing = false; // Флаг, указывающий, происходит ли рисование
var activeRectangleIndex = -1; // Индекс активного прямоугольника
var resizingLeft = false; // Флаг, указывающий, изменяется ли левый край
var resizingRight = false; // Флаг, указывающий, изменяется ли правый край
var startXLeft; // Начальная координата по горизонтали для левого края
var startXRight; // Начальная координата по горизонтали для правого края

function down(evt) {
    //evt.preventDefault();
    var x = evt.clientX - canvas.offsetLeft;
    var currentStartSec = shift_canvas / one_sec_points;
    // Проверяем, нажат ли курсор на краю прямоугольника
    for (var i = 0; i < TEXT_CONTAINER.length; i++) {

        var rect = {
            x: ((TEXT_CONTAINER[i].start - currentStartSec) * canvas.width) / long_sec,
            y: 0,
            width: ((TEXT_CONTAINER[i].end - currentStartSec) * canvas.width) / long_sec - ((TEXT_CONTAINER[i].start - currentStartSec) * canvas.width) / long_sec,
            height: 300
        };
        if (x >= rect.x && x <= rect.x + rect.width) {
            if (x <= rect.x + 10) { // Левый край
                activeRectangleIndex = i;
                resizingLeft = true;
                startXLeft = x;
            } else if (x >= rect.x + rect.width - 10) { // Правый край
                activeRectangleIndex = i;
                resizingRight = true;
                startXRight = x;
            }
            break;
        }
    }
    if (!resizingLeft && !resizingRight) {
        canvasX = evt.clientX - canvas.offsetLeft;
        isDrawing = true;
        start_select_second = shift_canvas / one_sec_points + (canvasX * long_sec) / canvas.width;
        console.log("start=", start_select_second);
    }
}

function move(event) {
    if (activeRectangleIndex !== -1) {
        var x = event.clientX - canvas.offsetLeft;
        var widthChange = x - startXLeft;

        if (resizingRight) {
            widthChange = x - startXRight;
            TEXT_CONTAINER[activeRectangleIndex].end += (widthChange * long_sec) / canvas.width;
            time_e = TEXT_CONTAINER[activeRectangleIndex].end;
            time_s = TEXT_CONTAINER[activeRectangleIndex].start;

        } else {
            TEXT_CONTAINER[activeRectangleIndex].start += (widthChange * long_sec) / canvas.width;
            time_e = TEXT_CONTAINER[activeRectangleIndex].end;
            time_s = TEXT_CONTAINER[activeRectangleIndex].start;
        }

        startXLeft = x;
        startXRight = x;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var rect_x0 = ((TEXT_CONTAINER[activeRectangleIndex].start - shift_canvas / one_sec_points) * canvas.width) / long_sec;
        var rect_x1 = ((TEXT_CONTAINER[activeRectangleIndex].end - shift_canvas / one_sec_points) * canvas.width) / long_sec;

        var rect = {
            x: rect_x0,
            y: 0,
            width: rect_x1 - rect_x0,
            height: canvas.height
        };
        ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        draw_div();
    }

    if (isDrawing) {
        var currentX = event.clientX - canvas.offsetLeft;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        draw_line();

        //Рисуем прямоугольник с фиксированной высотой
        var width = currentX - canvasX;
        var height = 300;
        ctx.fillStyle = "rgba(176, 224, 230, 0.5)";
        ctx.fillRect(canvasX, 0, width, height);
    }
}


function up(evt) {
    canvasX = evt.clientX - canvas.offsetLeft;
    end_select_second = shift_canvas / one_sec_points + (canvasX * long_sec) / canvas.width;
    if(start_select_second==end_select_second){
        isDrawing = false;
        time_s = start_select_second;
        time_e = duration;
    }else{
        if (activeRectangleIndex != -1) {
            start_select_second=TEXT_CONTAINER[activeRectangleIndex].start;
            end_select_second=TEXT_CONTAINER[activeRectangleIndex].end;
            textx=TEXT_CONTAINER[activeRectangleIndex].text;
            TEXT_CONTAINER.splice(activeRectangleIndex,1);
            update_text_container(start_select_second, end_select_second, textx);
            activeRectangleIndex = -1;
            resizingLeft = false;
            resizingRight = false;
        } else {
            isDrawing = false;
            draw_line();
            console.log("end=", end_select_second);
            if (start_select_second > end_select_second) {
                let t = start_select_second;
                start_select_second = end_select_second;
                end_select_second = t;
            }
            time_s = start_select_second;
            time_e = end_select_second;
            update_text_container(start_select_second, end_select_second, '');
        }
    }
}


var i = 0;
const left = 600;

function update_text_container(start, end, text) {
    for (let i = 0; i < TEXT_CONTAINER.length; i++) {
        //удаляем блоки, которые лежат внутри нашего блока
        // текст переносим в наш блок
        if (start <= TEXT_CONTAINER[i].start && end >= TEXT_CONTAINER[i].end) {
            text += " " + TEXT_CONTAINER[i].text;
            TEXT_CONTAINER.splice(i, 1);
            i--;
            continue;
        }

        //если блок содержит наш новый блок, мы его удалчяем, а текст сохраняем
        if (start > TEXT_CONTAINER[i].start && end < TEXT_CONTAINER[i].end) {
            text += " " + TEXT_CONTAINER[i].text;
            TEXT_CONTAINER.splice(i, 1);
            i--;
            continue;
        }

        //когда новый блок начинается внутри другого блока
        if (start > TEXT_CONTAINER[i].start && start < TEXT_CONTAINER[i].end) {
            TEXT_CONTAINER[i].end = start - 0.02;
            continue
        }

        //когда новый блок заканчивается внутри другого блока
        if (end > TEXT_CONTAINER[i].start && end < TEXT_CONTAINER[i].end) {
            TEXT_CONTAINER[i].start = end + 0.02;
            continue
        }
    }

    var wasAdded = false;
    for (let i = TEXT_CONTAINER.length - 1; i >= 0; i--) {
        if (TEXT_CONTAINER[i].start < start) {
            TEXT_CONTAINER.splice(i + 1, 0, {
                'start': start,
                'end': end,
                'text': text
            });
            wasAdded = true;
            break;
        }
    }

    if (!wasAdded)
        TEXT_CONTAINER.splice(0, 0, {
            'start': start,
            'end': end,
            'text': text
        });
    draw_div();
}


let inner_div = document.getElementById("inner-div");
const height_block = 300;

function draw_div() {
    var current_start_sec = shift_canvas / one_sec_points;

    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
    for (i = 0; i < TEXT_CONTAINER.length; i++) {
        if (current_start_sec > TEXT_CONTAINER[i].end || TEXT_CONTAINER[i].start > (current_start_sec + long_sec))
            continue

        if (TEXT_CONTAINER[i].start == start_select_second && TEXT_CONTAINER[i].end == end_select_second) {
            f = i;
            var rect_x0 = ((TEXT_CONTAINER[f].start - current_start_sec) * canvas.width) / long_sec;
            var rect_x1 = ((TEXT_CONTAINER[f].end - current_start_sec) * canvas.width) / long_sec;
            ctx.fillRect(rect_x0, 0, rect_x1 - rect_x0, height_block);
            ctx.stroke();
            break;
        }
    }


    inner_div.innerHTML = "";
    for (i = 0; i < TEXT_CONTAINER.length; i++) {
        if (TEXT_CONTAINER[i].end < current_start_sec || TEXT_CONTAINER[i].start > current_start_sec + long_sec)
            continue;

        var rect_x0 = ((TEXT_CONTAINER[i].start - current_start_sec) * canvas.width) / long_sec;
        var rect_x1 = ((TEXT_CONTAINER[i].end - current_start_sec) * canvas.width) / long_sec;

        ctx.fillStyle = 'rgba(127, 255, 0, 0.2)';
        ctx.fillRect(rect_x0, 0, rect_x1 - rect_x0, height_block);
        ctx.stroke();

        let tx = document.createElement("div");
        tx.classList.add("text1");
        tx.setAttribute("ondblclick", "makeEditable(this)");
        tx.setAttribute("onblur", "saveContent("+i+")");
        tx.setAttribute("oncontextmenu", "del(event,"+i+")");
        tx.setAttribute("onclick", "evt_play(event,"+i+")");
        tx.setAttribute("data-index", i)
        tx.innerHTML = TEXT_CONTAINER[i].text;
        tx.style.width = (rect_x1 - rect_x0) + 'px';
        tx.style.left = (rect_x0 + left) + 'px';
        inner_div.append(tx);
    }
}


//удаление блока при нажатии правой кнопки мыши
function del(event,i) {
    event.preventDefault();
    TEXT_CONTAINER.splice(i, 1);
    draw_line();
    draw_div();
}

//прослушивание блока при нажатии на него левой кнопкой мыши
function evt_play(event,i){
    if(event.button === 0){
        audio.currentTime =TEXT_CONTAINER[i].start;
        audio.play();
        console.log('начало',TEXT_CONTAINER[i].start,'конец',TEXT_CONTAINER[i].end);
        timeout = setTimeout(function () {
            audio.pause();
        }, (TEXT_CONTAINER[i].end - TEXT_CONTAINER[i].start) * 1000);
    }
}

//редактирование блока
var editableElement; // Глобальная переменная для хранения редактируемого элемента
function makeEditable(element) {
  element.contentEditable = true; // Делаем элемент редактируемым
  editableElement = element; // Сохраняем элемент в глобальную переменную
}

function saveContent(i) {
    if (editableElement) {
        var content = editableElement.innerText; // Получаем содержимое элемента
        TEXT_CONTAINER[i].text = content;
        console.log("Сохраненное содержимое:", content);
        editableElement.contentEditable = false; // Отключаем режим редактирования
        editableElement = null; // Сбрасываем глобальную переменную
    }
}



function next() {
    var move_content_percent = 0.75;
    var shift = long_sec * move_content_percent * one_sec_points;
    console.log(shift);
    inner_div.innerHTML = "";
    if (shift_canvas + shift + long_sec * one_sec_points < duration * one_sec_points)
        shift_canvas += shift;
    else {
        shift = duration * one_sec_points - long_sec * one_sec_points - shift_canvas;
        shift_canvas += shift;
    }
    shift_canvas = parseInt(shift_canvas);
    draw_line();
    draw_div();
}


function back() {
    var move_content_percent = 0.75;
    var shift = long_sec * move_content_percent * one_sec_points;
    console.log(shift);
    inner_div.innerHTML = "";
    shift_canvas -= shift;
    if (shift_canvas < 0) {
        shift_canvas = 0;
    }
    shift_canvas = parseInt(shift_canvas);
    draw_line();
    draw_div();

}

function minus() {
    scale -= 0.20;

    if (scale < 0.2)
        scale = 0.2;
    if(duration<10){
        scale=1;
        long_sec=duration;
    }else{
        long_sec = 1 / scale * 10;
    }
    console.log(scale);
    draw_line();
    draw_div();
}

function plus() {
    scale += 0.20;
    if (scale > 3){
        scale = 3;
    }

    long_sec = 1 / scale * 10;
    if(long_sec>duration){
        long_sec=duration;
        scale=(10/long_sec);
    }
    console.log(scale);
    draw_line();
    draw_div();
}

//функция кнопки прослушивания, кнопку спрятали
function play() {
    // var audio = document.getElementById("audio");
    audio.currentTime =time_s;
    audio.play();
    console.log('начало',time_s,'конец',time_e);
    if (time_s !== time_e) {
        timeout = setTimeout(function () {
            audio.pause();
        }, (time_e - time_s) * 1000);
    }
}

//кнопка паузы
var playPauseButton = document.getElementById('pause');
function togglePlayPause() {
    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
}

//отправка измененных данных на сервер AJAX
function Save(event){
    //статус
    if (event === 0) {
        status=1;
    } else if (event === 1) {
        status=2;
    }
// Отправляем данные на сервер с помощью AJAX
    $.ajax({
      url: "/save_content/",  // Укажите URL представления Django, которое обрабатывает запрос
      type: "POST",
      data: {
          'json_data': JSON.stringify(TEXT_CONTAINER), // Преобразуем объект JSON в строку
          'status': JSON.stringify(status)
      },
      success: function(response) {
        // Обработка ответа от сервера
        console.log(response);
      },
      /*error: function(error) {
        // Обработка ошибок
        console.error(error);
      }*/
    });
}