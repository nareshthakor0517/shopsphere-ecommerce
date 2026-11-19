from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0003_user_full_name"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="first_name",
        ),
        migrations.RemoveField(
            model_name="user",
            name="last_name",
        ),
    ]
