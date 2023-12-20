import torch
from PIL import Image
from diffusers import StableDiffusionInpaintPipeline
import argparse

def resize_image(image, target_size=(512, 512)):
    """Resize the image to the target size."""
    return image.resize(target_size, resample=Image.LANCZOS)

def main(image_path, mask_path, prompt):
    # Load the pipeline with full precision (float32)
    pipe = StableDiffusionInpaintPipeline.from_pretrained(
        "runwayml/stable-diffusion-inpainting",
        revision="fp16",
        torch_dtype=torch.float32,  # Adjust dtype to float32
    )

    # Load and resize the image and mask_image as PIL images
    image = resize_image(Image.open(image_path))
    mask_image = resize_image(Image.open(mask_path))

    # Perform inpainting
    output = pipe(prompt=prompt, image=image, mask_image=mask_image)

    # Save the result
    output.images[0].save("./output.png")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate an inpainted image using Stable Diffusion.')
    parser.add_argument('image_path', type=str, help='Path to the input image file')
    parser.add_argument('mask_path', type=str, help='Path to the inpainting mask file')
    parser.add_argument('prompt', type=str, help='Text prompt for the image generation')

    args = parser.parse_args()
    main(args.image_path, args.mask_path, args.prompt)
