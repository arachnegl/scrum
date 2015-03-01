# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('board', '0002_blogentry'),
    ]

    operations = [
        migrations.RenameField(
            model_name='blogentry',
            old_name='entry',
            new_name='text',
        ),
    ]
