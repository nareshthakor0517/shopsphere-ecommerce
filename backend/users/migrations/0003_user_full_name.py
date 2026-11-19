from django.db import migrations, models


def copy_existing_names(apps, schema_editor):
    User = apps.get_model("users", "User")
    for user in User.objects.only("pk", "first_name", "last_name").iterator():
        full_name = " ".join(part for part in (user.first_name, user.last_name) if part).strip()
        if full_name:
            User.objects.filter(pk=user.pk).update(full_name=full_name)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_rename_company_user_table"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="full_name",
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.RunPython(copy_existing_names, migrations.RunPython.noop),
    ]
