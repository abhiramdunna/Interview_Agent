import speech_recognition as sr
from gtts import gTTS
import playsound
import tempfile
import os

def text_to_speech(text: str):
    """Convert text to speech and play it immediately without saving"""
    try:
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=True) as fp:
            tts = gTTS(text=text, lang='en')
            tts.save(fp.name)
            playsound.playsound(fp.name)
    except Exception as e:
        raise RuntimeError(f"Text-to-speech conversion failed: {str(e)}")

def speech_to_text(duration: int = 5) -> str:
    """Convert speech to text without saving audio"""
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening...")
        try:
            audio = recognizer.record(source, duration=duration)
            return recognizer.recognize_google(audio)
        except sr.UnknownValueError:
            return "Could not understand audio"
        except sr.RequestError as e:
            return f"Speech recognition error: {str(e)}"
        except Exception as e:
            return f"Error: {str(e)}"