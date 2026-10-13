# Local voice model cache

Large voice model binaries are not committed to this repository.

Expected optional Piper voice files:

- Repository: https://huggingface.co/jgkawell/friday
- Model file: `en_GB-friday-medium.onnx`
- Metadata file: matching `.onnx.json`
- Local paths:
  - `data/voices/friday.onnx`
  - `data/voices/friday.onnx.json`

Install Piper with `pip install piper-tts`, place the files above, and keep
`voice.piper_enabled: true` in `config.yaml` to use the local voice path.
