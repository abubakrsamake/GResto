# encoding=utf-8
import asyncio
import bcrypt
from sqlalchemy import create_engine
from sqlalchemy import text

def main():
    from dotenv import load_dotenv
    import os
    load_dotenv()
    url = os.getenv("DB_URL", "postgresql://postgres:postgres@127.0.0.1:5432/GRestaurant")
    engine = create_engine(url)
    new_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode('utf-8')
    with engine.begin() as conn:
        roles_res = conn.execute(text("SELECT id, code FROM roles;"))
        roles_dict = {str(r[0]): r[1] for r in roles_res.fetchall()}
        superadmin_role_id = None
        for rid, code in roles_dict.items():
            if code == 'SUPERADMIN':
                superadmin_role_id = rid
        if superadmin_role_id:
            conn.execute(text("UPDATE users SET hashed_password = :hash WHERE role_id = :rid"), {"hash": new_hash, "rid": superadmin_role_id})
            print("Updated SUPERADMIN with hash")
        else:
            print("No SUPERADMIN role found")
    engine.dispose()
    print("Done. SUPERADMIN password = admin123")

main()
