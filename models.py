from django.db import models


class audio_list(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200)
    status = models.SmallIntegerField()
    created = models.DateTimeField("date published")
    updated = models.DateTimeField("date published")


class version(models.Model):
    id = models.AutoField(primary_key=True)
    audio_id=models.ForeignKey(audio_list, on_delete=models.CASCADE)
    date= models.DateTimeField("date published")


class audio_transcription(models.Model):
    id = models.AutoField(primary_key=True)
    version_id = models.ForeignKey(version, on_delete=models.CASCADE)
    words = models.CharField(max_length=200)
    start_sec = models.PositiveIntegerField()
    end_sec = models.PositiveIntegerField()
