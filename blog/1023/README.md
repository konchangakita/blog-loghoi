# スタート方法
そのうちフロントエンドとバックエンドは自動起動にする  
今は開発フェイズなので、デバッグしやすいように手動起動  

  
## コンテナ起動  
`docker-compose -f "docker-compose.yml" up -d --build`  
VS Code上から`docker-compose.yml`を選んで「Compose Up」でもOK

5つのコンテナ起動を確認
```sh
$ docker-compose ps
CONTAINER ID   IMAGE                  COMMAND                   CREATED         STATUS         PORTS                                                                                  NAMES
7fbbdac248ed   ongoing_backend        "bash -c 'cd /usr/sr…"   6 seconds ago   Up 3 seconds   0.0.0.0:7776->7776/tcp, :::7776->7776/tcp                                              loghoi-backend
6858050de2f7   elasticsearch:7.17.9   "/bin/tini -- /usr/l…"   6 seconds ago   Up 3 seconds   0.0.0.0:9200->9200/tcp, :::9200->9200/tcp, 0.0.0.0:9300->9300/tcp, :::9300->9300/tcp   elasticsearch
c59146b3a090   kibana:7.17.9          "/bin/tini -- /usr/l…"   6 seconds ago   Up 3 seconds   0.0.0.0:5601->5601/tcp, :::5601->5601/tcp                                              kibana
032695851f4e   ongoing_frontend       "docker-entrypoint.s…"   6 seconds ago   Up 3 seconds   0.0.0.0:7777->7777/tcp, :::7777->7777/tcp                                              loghoi-frontend
```
  
<br>  
<br>  

## バックエンド  
log-xplorer-backendのコンテナに接続する  
```
docker exec -it loghoi-backend -backend bash
```
`/usr/src/flaskr`配下に移動 `python app.py`を実行する
```
# python app.py 
##### ELASTIC_SERVER: http://elasticsearch:9200 ######
WebSocket transport not available. Install simple-websocket for improved performance.
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:7776
 * Running on http://172.18.0.3:7776
Press CTRL+C to quit
 * Restarting with stat
##### ELASTIC_SERVER: http://elasticsearch:9200 ######
WebSocket transport not available. Install simple-websocket for improved performance.
 * Debugger is active!
 * Debugger PIN: 133-067-435
```
   
<br>
<br>  
  
  
 - 起動確認  
ブラウザで、Dockerを実行している `サーバーIP:7776`、`localhost:7776/api/registration`アクセスしてみる  
![image](https://github.com/konchangakita/hack23-log-xplorer/assets/64240365/fce0b37f-1edb-4d48-975a-d12b4dcf3c76)

<br>
<br>  
  
## フロントエンド  
log-xplorer-backendのコンテナに接続する  
```
docker exec -it loghoi-frontend bash
```
`/usr/src/next-app/log-xplorer` 配下で `npm run dev`  
```
npm run dev

> dev
> next dev -p 7777

ready - started server on 0.0.0.0:7777, url: http://localhost:7777
Attention: Next.js now collects completely anonymous telemetry regarding usage.
This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
https://nextjs.org/telemetry


🌼 daisyUI components 2.51.6  https://daisyui.com
  ✔︎ Including:  base, components, 1 themes, utilities
  ❤︎ Support daisyUI:  https://opencollective.com/daisyui 
```
  
<br>
<br>

- 起動確認  
ブラウザで、`localhost:7777` にアクセス  
![image](https://github.com/konchangakita/blog-loghoi/assets/64240365/cd1deacb-9e10-4807-95e0-068176eaae00)
