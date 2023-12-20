import cv2
import dlib
import numpy as np
import argparse

def generate_mouth_mask(image_path, predictor_path):
    # Load the image
    image = cv2.imread(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Initialize dlib's face detector and facial landmark predictor
    detector = dlib.get_frontal_face_detector()
    predictor = dlib.shape_predictor(predictor_path)

    # Detect faces
    faces = detector(gray)

    # Create a black image for the mask
    mask = np.zeros_like(gray)

    for face in faces:
        # Get the landmarks/parts for the face
        landmarks = predictor(gray, face)

        # Extract the mouth coordinates
        mouth_points = np.array([[p.x, p.y] for p in landmarks.parts()[48:68]])

        # Draw the mouth region on the mask
        cv2.fillPoly(mask, [mouth_points], (255, 255, 255))

    return mask

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate a mouth mask from an image.')
    parser.add_argument('image_path', type=str, help='Path to the input image')
    parser.add_argument('predictor_path', type=str, help='Path to dlib\'s shape predictor')
    args = parser.parse_args()

    mask = generate_mouth_mask(args.image_path, args.predictor_path)
    cv2.imwrite("mouth_mask.png", mask)

# Note: The imshow, waitKey, and destroyAllWindows functions are removed.
