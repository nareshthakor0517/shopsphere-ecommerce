from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
        ("store", "0002_split_domain_models"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="user",
            table="shopsphere_users",
        ),
    ]
