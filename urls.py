from django.urls import path

from . import views

urlpatterns = [
    # ex: /polls/
    path("", views.index, name="index"),
    path("list/", views.list, name="list"),
    path("edit/<int:audio_id>", views.edit, name="edit"),
    path("get_AJAX/", views.get_AJAX, name='get_AJAX'),
    path('save_content/', views.save_content, name='save_content')
]