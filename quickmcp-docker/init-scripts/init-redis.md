    Open a new terminal and run this command to enter the Redis CLI:
        docker exec -it quickmcp-redis redis-cli
    Inside the CLI, set some sample data:
        SET user:100 '{"name": "Alice", "status": "active"}'
        SET session:alpha "some_session_token"
    Retrieve the data using the GET command:
        GET user:100