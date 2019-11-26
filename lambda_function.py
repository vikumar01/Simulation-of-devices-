import json
import smtplib, ssl

def lambda_handler(event, context):
    message = event['queryStringParameters']['message']
    to = event['queryStringParameters']['to']
    port = 465  # For SSL
    password = ""
    senderEmail = ""
    # Create a secure SSL context
    server_context = ssl.create_default_context()
    
    with smtplib.SMTP_SSL("smtp.gmail.com", port, context=server_context) as server:
        server.login(senderEmail, password)
        server.sendmail(senderEmail, to, message)
    
    return {
        'statusCode': 200,
        'body': json.dumps('Mail sent')
    }
