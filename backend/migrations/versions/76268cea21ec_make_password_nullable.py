"""Make password nullable (SQLite-compatible)

Revision ID: 76268cea21ec
Revises: 
Create Date: 2025-07-17 16:50:43.613490
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '76268cea21ec'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Step 1: Rename old table
    op.execute("ALTER TABLE users RENAME TO users_old")

    # Step 2: Create new users table with password nullable
    op.create_table(
        'users',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('email', sa.String, nullable=False),
        sa.Column('password', sa.String, nullable=True),
        sa.Column('username', sa.String),
        sa.Column('name', sa.String),
        sa.Column('created_at', sa.DateTime),
        # Add any other columns from your User model
    )

    # Step 3: Copy data from old to new
    op.execute("""
        INSERT INTO users (id, email, password, username, name, created_at)
        SELECT id, email, password, username, name, created_at FROM users_old
    """)

    # Step 4: Drop old table
    op.execute("DROP TABLE users_old")


def downgrade():
    pass  # Optional: write logic to reverse this
