import torch
import os
import tempfile
from pydub import AudioSegment
import argparse
import soundfile as sf
import re

def split_text(text, max_length=500):
    """Split text into chunks at periods or when the max_length is reached, then wrap each chunk in <p> and <speak> tags."""
    sentences = re.split(r'(?<=\.)\s+', text)
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        # If sentence is too long, split it further
        while len(sentence) > max_length:
            # Find a suitable split point
            split_point = sentence.rfind(' ', 0, max_length)
            if split_point == -1:
                # No suitable split, force split at max_length
                split_point = max_length
            part = sentence[:split_point]
            sentence = sentence[split_point:].strip()

            # Add part to chunk
            if len(current_chunk) + len(part) <= max_length:
                current_chunk += f"<p>{part}</p>"
            else:
                if current_chunk:
                    chunks.append(f"<speak>{current_chunk}</speak>")
                current_chunk = f"<p>{part}</p>"

        # Add remaining sentence to chunk
        wrapped_sentence = f"<p>{sentence}</p>"
        if len(current_chunk) + len(wrapped_sentence) <= max_length:
            current_chunk += wrapped_sentence
        else:
            if current_chunk:
                chunks.append(f"<speak>{current_chunk}</speak>")
            current_chunk = wrapped_sentence

    if current_chunk:
        chunks.append(f"<speak>{current_chunk}</speak>")

    return chunks

def generate_mp3(text_file, output_path):
    # Initialize parameters
    language = 'en'
    model_id = 'v3_en'
    sample_rate = 48000
    device = torch.device('cpu')
    # speaker = 'en_77'
    speaker = 'en_33'

    # Load the model
    model, _ = torch.hub.load(repo_or_dir='snakers4/silero-models',
                              model='silero_tts',
                              language=language,
                              speaker=model_id)
    model.to(device)

    # Read text from file
    with open(text_file, 'r', encoding='utf-8') as file:
        text = file.read()

    # Convert text to SSML and split into chunks
    text_chunks = split_text(text)


    # Initialize an empty AudioSegment for concatenating
    full_audio_segment = AudioSegment.silent(duration=0)

    for chunk in text_chunks:
        # Generate audio
        audio = model.apply_tts(ssml_text=chunk, speaker=speaker, sample_rate=sample_rate)

        # Convert tensor to numpy array
        audio_numpy = audio.numpy()

        # Use a temporary file to save the WAV
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
            temp_wav_name = temp_wav.name
            sf.write(temp_wav_name, audio_numpy, sample_rate)

        # Read the WAV file with pydub
        audio_segment = AudioSegment.from_wav(temp_wav_name)

        # Concatenate to the full audio
        full_audio_segment += audio_segment

        # Remove the temporary WAV file
        os.remove(temp_wav_name)

    # Save the full audio data to an MP3 file
    full_audio_segment.export(output_path, format="mp3")

if __name__ == "__main__":
    # Set up argument parsing
    parser = argparse.ArgumentParser(description="Generate MP3 from text using TTS")
    parser.add_argument("text_file", type=str, help="Path to the input text file")
    parser.add_argument("output_path", type=str, help="Path and name of the output MP3 file")

    # Parse arguments
    args = parser.parse_args()

    # Generate MP3
    generate_mp3(args.text_file, args.output_path)
