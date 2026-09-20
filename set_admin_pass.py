# -*- coding: utf-8 -*-
import psycopg2, bcrypt
new_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode('utf-8')
conn = psycopg2.connect("dbname=DB_GResto user=postgres host=127.0.0.1 port=5432 password=root")
cur = conn.cursor()
cur.execute("UPDATE users SET hashed_password = %s WHERE id = %s;",(new_hash, "da792e96-f4d6-43a1-bece-07265a9d64ae"))
conn.commit()
print("Done: ADMIN password = admin123")
conn.close()
