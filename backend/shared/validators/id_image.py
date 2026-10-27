from django.conf import settings
from PIL import Image, UnidentifiedImageError

ALLOWED_FORMATS = {"JPEG", "PNG"}


def id_image_problem(file):
    """Why an ID card image is refused (UC-01 4c), or None if it is accepted.

    The format is read from the file content, not from its name or declared type.
    """
    if file is None:
        return "The image of this side is required."
    if file.size > settings.ID_IMAGE_MAX_BYTES:
        return f"The image must not exceed {settings.ID_IMAGE_MAX_BYTES // (1024 * 1024)} MB."
    try:
        file.seek(0)
        with Image.open(file) as image:
            image.verify()
            image_format = image.format
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        image_format = None
    finally:
        file.seek(0)
    if image_format not in ALLOWED_FORMATS:
        return "Only JPG and PNG images are accepted."
    return None
