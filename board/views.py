from django.contrib.auth import get_user_model

from rest_framework import authentication, permissions, viewsets

from .models import BlogEntry, Sprint, Task
from .serializers import (
    SprintSerializer, TaskSerializer, UserSerializer, BlogEntrySerializer
)


User = get_user_model()


class DefaultsMixin:

    authentication_classes = (
        authentication.BasicAuthentication,
        authentication.TokenAuthentication,
    )
    permission_classes = (
        permissions.IsAuthenticated,
    )
    paginate_by = 25
    paginate_by_param = 'page_size'
    max_paginate_by = 100


class SprintViewSet(DefaultsMixin, viewsets.ModelViewSet):
    """ API endpoint for listing & creating sprints """

    queryset = Sprint.objects.order_by('end')
    serializer_class = SprintSerializer


class TaskViewSet(DefaultsMixin, viewsets.ModelViewSet):
    """ API endpoint for listing & creating tasks """

    queryset = Task.objects.all()
    serializer_class = TaskSerializer


class BlogEntryViewSet(DefaultsMixin, viewsets.ModelViewSet):

    queryset = BlogEntry.objects.order_by('created')
    serializer_class = BlogEntrySerializer


class UserViewSet(DefaultsMixin, viewsets.ReadOnlyModelViewSet):
    """ API endpoint for listing users """

    lookup_field = User.USERNAME_FIELD
    lookup_url_kwarg = User.USERNAME_FIELD
    queryset = User.objects.order_by(User.USERNAME_FIELD)
    serializer_class = UserSerializer


