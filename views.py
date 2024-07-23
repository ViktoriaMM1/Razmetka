from django.shortcuts import render
from django.http import HttpResponse
from django.http import JsonResponse
from .models import audio_list, version, audio_transcription
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.contrib.staticfiles.storage import staticfiles_storage
import datetime
import locale
import os.path
import subprocess
import os
from scipy.io import wavfile
from scipy import signal
from django.db.models import Max, Q
from transformers import AutoTokenizer, AutoFeatureExtractor, AutoModelForCTC
from datasets import load_dataset
import datasets
import torch
import scipy.signal as sps
import gc
from pydub import AudioSegment
import json


int_array = []
input_file = ''
text_content=[]
filter_version=''


def model_audio_list(uploadedFile):
    asr_model = audio_list()
    asr_model.name = uploadedFile.name
    asr_model.status = 0
    asr_model.created = datetime.datetime.now()
    asr_model.updated = datetime.datetime.now()
    asr_model.save()
    return asr_model


def model_version2(asr_model):
    model_version = version()
    model_version.date = datetime.datetime.now()
    model_version.audio_id = asr_model
    model_version.save()
    return model_version


def model_transcription2(arr_JSON, model_version):
    for i in range(len(arr_JSON)):
        model_transcription = audio_transcription()
        model_transcription.version_id = model_version
        model_transcription.words = arr_JSON[i]["word"]
        model_transcription.start_sec = arr_JSON[i]["start_offset"]*100
        model_transcription.end_sec = arr_JSON[i]["end_offset"]*100
        model_transcription.save()


def model_transcription3(arr_JSON, model_version):
    for i in range(len(arr_JSON)):
        model_transcription = audio_transcription()
        model_transcription.version_id = model_version
        model_transcription.words = arr_JSON[i]["text"]
        model_transcription.start_sec = arr_JSON[i]["start"]*100
        model_transcription.end_sec = arr_JSON[i]["end"]*100
        model_transcription.save()


# Create your views here.
@csrf_exempt
def index(request):
    if request.method == 'POST':
        uploadedFile = request.FILES["uploadedFile"]

        # Заполнение таблицы audio_list()
        asr_model=model_audio_list(uploadedFile)

        # Сохранение аудио-файла
        extension = asr_model.name.split('.')
        extension = extension[-1]
        pth = os.path.abspath(os.path.dirname(__file__))
        file_name = default_storage.save(f"{pth}/static/manage_asr/audio_file/{asr_model.id}.{extension}", uploadedFile)
        # Заполнение таблицы version()
        model_version = model_version2(asr_model)

        # Получение массива объектов
        arr_JSON = cut_audio(f"{pth}/static/manage_asr/audio_file/{asr_model.id}.{extension}")
        print(arr_JSON)

        # Заполнение таблицы  audio_transcription()
        model_transcription2(arr_JSON, model_version)

        # конфертация в mp3
        pth = os.path.abspath(os.path.dirname(__file__))
        global input_file
        input_file = f"{pth}/static/manage_asr/audio_file/{asr_model.id}.{extension}"  # Путь к исходному аудио файлу (например, WAV)
        output_file = f"{pth}/static/manage_asr/audio_file/new{asr_model.id}.mp3"  # Путь к выходному аудио файлу (например, MP3)
        print(input_file)
        # Конвертация аудио файла в MP3 с помощью ffmpeg
        command = ["ffmpeg", "-i", input_file, output_file]
        subprocess.run(command)

        global int_array
        # Запись аудиоданных во временный файл WAV
        temp_wav_file = f"{pth}\static\manage_asr\\audio_file\\temp.wav"
        subprocess.run(
            ["ffmpeg", "-i", output_file, "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "1", temp_wav_file])
        # Чтение временного файла WAV и получение аудиоданных
        sample_rate, audio_data = wavfile.read(temp_wav_file)
        # Целевая частота дискретизации
        target_sample_rate = 50
        # Изменение частоты дискретизации
        resampled_audio = signal.resample(audio_data, int(len(audio_data) * target_sample_rate / sample_rate))
        # Преобразование в целочисленный массив
        int_array = (resampled_audio).astype(int)
        # запись в файл
        with open(f"{pth}\static\manage_asr\canvas_arr\\arr{asr_model.id}.txt", 'w') as file:
            for item in int_array:
                file.write(str(item) + '\n')
        # Удаление временного файла WAV
        os.remove(f"{pth}\static\manage_asr\\audio_file\\temp.wav")

        return render(request, 'manage_asr/ind.html')

    else:
        return render(request, 'manage_asr/ind.html')


def list(request):
    asr_model = audio_list.objects.all()
    return render(request, 'manage_asr/list.html', {'data': asr_model})



def edit(request, audio_id):
    pth = os.path.abspath(os.path.dirname(__file__))
    # Открыть файл для чтения
    with open(f"{pth}\static\manage_asr\canvas_arr\\arr{audio_id}.txt", 'r') as file:
        lines = file.readlines()
    # Преобразование строк в числа и создание массива
    global int_array
    int_array = [int(line.strip()) for line in lines]

    global filter_version
    filter_version = version.objects.filter(audio_id_id=audio_id).order_by('-id').first()
    content = audio_transcription.objects.filter(version_id_id=filter_version.id)
    global text_content
    text_content = []
    for value in content:
        text_content.append({"words":value.words, "start_sec":value.start_sec/100, "end_sec":value.end_sec/100})
    return render(request, 'manage_asr/edit.html', {'data': audio_id})


def get_AJAX(request):
    global int_array, text_content
    int_list =int_array
    content_list = text_content
    answer={'arr': int_list, 'words': content_list}
    return JsonResponse(answer)


tokenizer = AutoTokenizer.from_pretrained("AigizK/wav2vec2-large-xls-r-300m-bashkir-cv7_opt")
model = AutoModelForCTC.from_pretrained("AigizK/wav2vec2-large-xls-r-300m-bashkir-cv7_opt")
feature_extractor = AutoFeatureExtractor.from_pretrained("AigizK/wav2vec2-large-xls-r-300m-bashkir-cv7_opt")


def get_word_timestamp(audio_filepath):
    audio_sample_rate, data = wavfile.read(audio_filepath)

    #     print(sample_rate,len(data),data.shape)

    sample_rate = 16000
    number_of_samples = round(len(data) * float(sample_rate) / audio_sample_rate)
    data = sps.resample(data, number_of_samples)

    input_values = feature_extractor(data, sampling_rate=sample_rate, return_tensors="pt").input_values
    # input_values = input_values.cuda()

    logits = model(input_values).logits
    pred_ids = torch.argmax(logits, axis=-1)

    time_offset = model.config.inputs_to_logits_ratio / 16000

    outputs = tokenizer.batch_decode(pred_ids, output_char_offsets=False, output_word_offsets=True)
    result = {
        "file": audio_filepath,
        "text": outputs.text[0],
        #   "char_offsets": outputs.char_offsets[0],
        "word_offsets": outputs.word_offsets[0]
    }

    # for i in range(len(result["char_offsets"])):
    #     char_ts = result["char_offsets"][i]
    #     char_ts["start_offset"] = char_ts["start_offset"] * time_offset
    #     char_ts["end_offset"] = char_ts["end_offset"] * time_offset
    #     result["char_offsets"][i] = char_ts

    for i in range(len(result["word_offsets"])):
        word_ts = result["word_offsets"][i]
        word_ts["start_offset"] = word_ts["start_offset"] * time_offset
        word_ts["end_offset"] = word_ts["end_offset"] * time_offset
        result["word_offsets"][i] = word_ts

    del input_values
    del logits

    return result["word_offsets"]


def cut_audio(file):
    pth = os.path.abspath(os.path.dirname(__file__))
    words = []
    time = 0
    audio_file = AudioSegment.from_file(file)
    duration_in_ms = len(audio_file)
    for i in range(0, duration_in_ms, 30000):
        start_time = i  # начало обрезки в миллисекундах
        end_time = i + 30000
        if end_time > duration_in_ms:
            end_time = duration_in_ms  # конец обрезки в миллисекундах
        trimmed_audio = audio_file[start_time:end_time]
        trimmed_audio.export(f"{pth}\static\manage_asr\\audio_file\\cut{i}.wav", format="wav")
        temp = get_word_timestamp(f"{pth}\static\manage_asr\\audio_file\\cut{i}.wav")
        for j in range(len(temp)):
            temp[j]["start_offset"] += time
            temp[j]["end_offset"] += time
        words += temp
        os.remove(f"{pth}\static\manage_asr\\audio_file\\cut{i}.wav")
        time += 30
    return words


@csrf_exempt
def save_content(request):
    if request.method == 'POST':
        json_data = request.POST.get('json_data')
        status_audio = request.POST.get('status')
        new_content=json.loads(json_data)
        status_audio=json.loads(status_audio)
        print(new_content)
        global filter_version
        print(filter_version.audio_id_id)
        audio_id=audio_list.objects.get(id=filter_version.audio_id_id)
        audio_id.status=status_audio
        audio_id.save()
        print(audio_id)
        new_version=model_version2(audio_id)
        model_transcription3(new_content, new_version)

        response_data = {'message': 'Запрос успешно обработан!'}
        return JsonResponse(response_data)

    # Вернуть ошибку, если запрос не POST
    return JsonResponse({'error': 'Метод запроса должен быть POST.'}, status=400)
