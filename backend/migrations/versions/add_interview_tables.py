"""add interview tables

Revision ID: add_interview_tables
Revises: 76268cea21ec
Create Date: 2024-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'add_interview_tables'
down_revision = '76268cea21ec'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create interview_sessions table
    op.create_table('interview_sessions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(length=50), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=True),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('questions_asked', sa.Integer(), nullable=True),
        sa.Column('questions_answered', sa.Integer(), nullable=True),
        sa.Column('resume_used', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('performance_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_interview_sessions_session_id'), 'interview_sessions', ['session_id'], unique=True)
    
    # Create interview_messages table
    op.create_table('interview_messages',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('speaker', sa.String(length=10), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('message_order', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.session_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create interview_results table
    op.create_table('interview_results',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('overall_score', sa.Float(), nullable=False),
        sa.Column('eye_contact_score', sa.Float(), nullable=False),
        sa.Column('posture_score', sa.Float(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('clarity_score', sa.Float(), nullable=False),
        sa.Column('technical_knowledge_score', sa.Float(), nullable=False),
        sa.Column('communication_score', sa.Float(), nullable=False),
        sa.Column('ai_feedback', sa.Text(), nullable=False),
        sa.Column('strengths', sqlite.JSON, nullable=True),
        sa.Column('areas_for_improvement', sqlite.JSON, nullable=True),
        sa.Column('recommendations', sqlite.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.session_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_interview_results_session_id'), 'interview_results', ['session_id'], unique=True)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_interview_results_session_id'), table_name='interview_results')
    op.drop_table('interview_results')
    op.drop_table('interview_messages')
    op.drop_index(op.f('ix_interview_sessions_session_id'), table_name='interview_sessions')
    op.drop_table('interview_sessions')
