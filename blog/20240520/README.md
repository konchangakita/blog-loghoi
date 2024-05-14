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
docker exec -it loghoi-backend bash
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
`/usr/src/next-app/log-xplorer` 配下で `yarn`  
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
Prism Central の情報入力して登録します
![image](https://github.com/konchangakita/blog-loghoi/assets/64240365/9f357520-df3c-4a2d-9b55-7c58e262d8c6)
  
  
- クラスタを選択  
![image](https://github.com/konchangakita/blog-loghoi/assets/64240365/ae461b5c-fe2d-442c-a6c9-1f35f837ac17)
  
  
- Realtime Log を選択  
![image](https://github.com/konchangakita/blog-loghoi/assets/64240365/e11cf7f2-3c08-4c27-8f1d-5c7b9e43144a)
  
<br>
<br>
  
## リアルタイムログビューワー
SSH KEY をクラスタに登録する  
![image](https://github.com/konchangakita/blog-loghoi/assets/64240365/61812355-d5d5-4dbb-ad97-727a5b9433be)

  
SSH KEYをコピー  
![image](https://github.com/konchangakita/blog-loghoi/assets/64240365/71cf4ac7-5d99-4b68-8a00-351721899ba2)

  
Prismに SSH KEY 登録  
Prismにログインしクラスタロックダウンの設定ページで、公開鍵を登録  
![image](https://github.com/konchangakita/blog-loghoi/assets/64240365/4f2b7fa9-faf5-4ec6-93ab-e70574026da1)  
<img src="https://github.com/konchangakita/blog-loghoi/assets/64240365/da7c2942-f91b-423e-adff-12d8517a7494" width="400">  

  
ログを選んで、Tail -f 開始  
![image](https://github.com/konchangakita/blog-loghoi/assets/64240365/ffec398c-663d-4b63-a42d-dd691b736e19)
  
<br>
<br>
  
## リアルタイムログビューワー

![image](https://github.com/konchangakita/blog-loghoi/assets/64240365/5325b098-5124-42a4-abd0-3338975d0ad5)




### クラスタ側でsyslog設定は CVM でCLIでの設定が必要  
Acropolis Advanced Administration Guide  
https://portal.nutanix.com/page/documents/details?targetId=Advanced-Admin-AOS-v6_5:set-rsyslog-config-c.html

cvmにssh  
```sh
ncli
````

なぜかTCPじゃないとうまくいかなかったので
１．syslogサーバの登録  
```sh
rsyslog-config add-server name=elastic-filebeat ip-address=xx.xxx.xxx.xxx port=7515 network-protocol=TCP relp-enabled=false
```

実行結果サンプル
```sh
<ncli> rsyslog-config add-server name=elastic-filebeat ip-address=10.38.4.22 port=7515 network-protocol=TCP relp-enabled=false

    Name                      : elastic-filebeat
    IP Address                : 10.38.4.22
    Port                      : 7515
    Protocol                  : TCP
    Relp Enabled              : false
```

２．送信対象のモジュールを指定（ERROR以上）  
```sh
rsyslog-config add-module server-name=elastic-filebeat module-name=CASSANDRA level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=CEREBRO level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=CURATOR level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=GENESIS level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=PRISM level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=STARGATE level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=SYSLOG_MODULE level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=ZOOKEEPER level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=UHURA level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=LAZAN level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=API_AUDIT level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=CALM level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=EPSILON level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=ACROPOLIS level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=MINERVA_CVM level=ERROR include-monitor-logs=false
rsyslog-config add-module server-name=elastic-filebeat module-name=FLOW level=ERROR include-monitor-logs=false
```
  
実行結果サンプル  
```  
<ncli> rsyslog-config add-module server-name=elastic-filebeat module-name=CASSANDRA level=ERROR include-monitor-logs=false

    RSyslog Servers           : elastic-filebeat
    Module Name               : CASSANDRA
    Log Level                 : ERROR
    Include Monitor Logs      : false
<ncli> rsyslog-config add-module server-name=elastic-filebeat module-name=CEREBRO level=ERROR include-monitor-logs=false

    RSyslog Servers           : elastic-filebeat
    Module Name               : CEREBRO
    Log Level                 : ERROR
    Include Monitor Logs      : false
（以下略）
```
  

![image](https://github.com/konchangakita/blog-loghoi/assets/64240365/c98cd032-1842-48c0-b376-ec5b2af7dbb1)
  
![image](https://github.com/konchangakita/blog-loghoi/assets/64240365/cac88e5e-5fe7-4d13-b157-8190f5cbcfe0)
  
  
中身は Elasticsearch なので Kibana でも確認も可能  
![image](https://github.com/konchangakita/blog-loghoi/assets/64240365/049eb1b6-6a29-4b03-a2f8-df56f0191183)
  
![image](https://github.com/konchangakita/blog-loghoi/assets/64240365/63c52611-84b8-4b32-8848-c85beb827eea)







