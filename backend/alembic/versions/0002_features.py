"""staff, email verification, feedback and reopen

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-28 06:24:22.186656

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('email_otps',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('purpose', sa.String(), nullable=False),
    sa.Column('code_hash', sa.String(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('attempts', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('email_otps', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_email_otps_email'), ['email'], unique=False)

    with op.batch_alter_table('complaints', schema=None) as batch_op:
        batch_op.add_column(sa.Column('resolved_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('rating', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('feedback_text', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('rated_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('reopened_count', sa.Integer(), server_default=sa.text('0'), nullable=False))
        batch_op.add_column(sa.Column('reopened_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('reopen_reason', sa.Text(), nullable=True))

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_verified', sa.Boolean(), server_default=sa.true(), nullable=False))
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False))

    # Existing accounts predate email verification: treat them as verified
    # (server_default above already does), and give already-resolved
    # complaints a resolved_at so the reopen window has something to measure.
    op.execute("UPDATE complaints SET resolved_at = updated_at WHERE status = 'resolved' AND resolved_at IS NULL")


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('is_active')
        batch_op.drop_column('is_verified')

    with op.batch_alter_table('complaints', schema=None) as batch_op:
        batch_op.drop_column('reopen_reason')
        batch_op.drop_column('reopened_at')
        batch_op.drop_column('reopened_count')
        batch_op.drop_column('rated_at')
        batch_op.drop_column('feedback_text')
        batch_op.drop_column('rating')
        batch_op.drop_column('resolved_at')

    with op.batch_alter_table('email_otps', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_email_otps_email'))

    op.drop_table('email_otps')
