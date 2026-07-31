import pymysql
import os

schema_path = os.path.join('database', 'schema.sql')

with open(schema_path, 'r', encoding='utf-8') as f:
    sql = f.read()

# Connect to the database with MULTI_STATEMENTS enabled
connection = pymysql.connect(
    host='127.0.0.1',
    user='root',
    password='root',
    port=3306,
    client_flag=pymysql.constants.CLIENT.MULTI_STATEMENTS
)

try:
    with connection.cursor() as cursor:
        cursor.execute(sql)
    connection.commit()
    print("Schema imported successfully on host!")
finally:
    connection.close()
