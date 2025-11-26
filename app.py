import gradio as gr
import ollama

def chat(message):
    response = ollama.chat(model='qwen2:0.5b-q8_0', messages=[{'role': 'user', 'content': message}])
    return response['message']['content']

gr.Interface(fn=chat, inputs="textbox", outputs="textbox").launch()