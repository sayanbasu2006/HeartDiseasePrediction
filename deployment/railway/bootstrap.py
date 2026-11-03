"""Start the pinned backend release on the official Python image.
The deployment bundle contains code/model artifacts only, never personal records.
"""
import base64,hashlib,io,os,re,subprocess,sys,tarfile
from pathlib import Path

def main():
    chunks=[os.environ[k] for k in sorted(os.environ) if re.fullmatch(r'CARDIOLENS_SOURCE_\d{2}',k)]
    packed=base64.b64decode(''.join(chunks),validate=True)
    digest=hashlib.sha256(packed).hexdigest()
    if digest!=os.environ['CARDIOLENS_RELEASE_SHA256']:raise RuntimeError('Release checksum mismatch.')
    release=Path('/opt/cardiolens');release.mkdir(parents=True,exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(packed),mode='r:xz') as archive:archive.extractall(release,filter='data')
    state=Path(os.environ.get('CARDIOLENS_STATE_DIR','/data'));state.mkdir(parents=True,exist_ok=True)
    environment=state/'python-env'
    if not (environment/'bin/python').exists():subprocess.run([sys.executable,'-m','venv',str(environment)],check=True)
    requirements=release/'backend/requirements-lock.txt'
    requirement_hash=hashlib.sha256(requirements.read_bytes()).hexdigest()
    stamp=environment/'.requirements-sha256'
    if not stamp.exists() or stamp.read_text()!=requirement_hash:
        subprocess.run([str(environment/'bin/python'),'-m','pip','install','--no-cache-dir','-r',str(requirements)],check=True)
        stamp.write_text(requirement_hash)
    os.chdir(release)
    print('Starting verified CardioLens API release '+digest[:12],flush=True)
    python=str(environment/'bin/python')
    os.execv(python,[python,'-m','uvicorn','backend.api.main:app','--host','0.0.0.0','--port',os.environ.get('PORT','8080'),'--no-access-log'])
if __name__=='__main__':main()
