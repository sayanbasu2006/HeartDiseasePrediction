import os, json
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, Text, select, delete
from sqlalchemy.orm import DeclarativeBase, Session
from backend.ml.data import ROOT


class Base(DeclarativeBase):
    pass


class Record(Base):
    __tablename__ = "measurements"
    id = Column(Integer, primary_key=True)
    payload = Column(Text, nullable=False)


engine = create_engine(
    os.environ.get("DATABASE_URL", f'sqlite:///{ROOT / "history.sqlite"}'),
    connect_args={"check_same_thread": False},
)
Base.metadata.create_all(engine)


def save(measurements):
    with Session(engine) as session:
        session.add_all([Record(payload=m.model_dump_json()) for m in measurements])
        session.commit()


def read():
    with Session(engine) as session:
        return sorted(
            [
                {"id": r.id, **json.loads(r.payload)}
                for r in session.scalars(select(Record)).all()
            ],
            key=lambda r: datetime.fromisoformat(r["timestamp"]).astimezone(
                timezone.utc
            ),
        )


def clear():
    with Session(engine) as session:
        session.execute(delete(Record))
        session.commit()
