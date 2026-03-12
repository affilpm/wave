from django.http import HttpResponse
from PIL import Image, ImageDraw
import io

def placeholder_image(request, width, height):
    """
    Generate a dynamic placeholder image with a solid color.
    """
    # Create a simple colored image
    # Use a neutral dark gray for the music player aesthetic
    color = (40, 40, 40) 
    image = Image.new('RGB', (int(width), int(height)), color=color)
    
    # Optional: draw some text or a simple shape
    draw = ImageDraw.Draw(image)
    # Just a simple rectangle border
    draw.rectangle([0, 0, int(width)-1, int(height)-1], outline=(60, 60, 60), width=2)

    # Save to buffer
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    
    return HttpResponse(buffer.getvalue(), content_type="image/png")
