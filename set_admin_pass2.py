# encoding=utf-8
import psycopg2, bcrypt
new_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode('utf-8')
# Connexion sans caractere special
conn = psycopg2.connect(host='127.0.0.1', port=5432, dbname='GRestaurant', user='postgres', password='postgres')
cur = conn.cursor()
cur.execute("SELECT id, role_id FROM users;")
users = cur.fetchall()
cur.execute("SELECT id, code FROM roles;")
roles = {r[1]: r[0] for r in cur.fetchall()}
for uid, rid in users:
    cur.execute("SELECT code FROM roles WHERE id = %s;", (rid,))
    rcode = cur.fetchone()
    if rcode and rcode[0] == 'SUPERADMIN':
        cur.execute("UPDATE users SET hashed_password = %s WHERE id = %s;", (new_hash, uid))
        print('Updated SUPERADMIN:', uid)
conn.commit()
print('Done. SUPERADMIN password = admin123')
conn.close()
