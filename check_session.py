import psycopg2
conn = psycopg2.connect('dbname=DB_GResto user=postgres password=root host=localhost port=5432')
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'register_sessions'")
print('Colonnes:', [r[0] for r in cur.fetchall()])
cur.execute("SELECT id, status FROM register_sessions")
print('Sessions:', cur.fetchall())
cur.close(); conn.close()
