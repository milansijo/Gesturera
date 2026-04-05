import pymysql

def create_db(host="localhost", db_name="sign_copilot_db"):
    passwords_to_try = ["", "root", "password", "admin", "1234", "123456"]
    for password in passwords_to_try:
        try:
            connection = pymysql.connect(
                host=host,
                user="root",
                password=password
            )
            with connection.cursor() as cursor:
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name};")
            connection.commit()
            print(f"Successfully connected with password '{password}' and created database '{db_name}'.")
            
            # Save the successful password to a file so we can use it in our config
            with open("mysql_password.txt", "w") as f:
                f.write(password)
                
            return True
        except pymysql.err.OperationalError as e:
            print(f"Failed with password '{password}': {e}")
            
    print("Failed to connect to MySQL with all common passwords. Please specify the password manually.")
    return False

if __name__ == "__main__":
    create_db()
