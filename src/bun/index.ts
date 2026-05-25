import { BrowserWindow } from "electrobun/bun";
import { serve } from "bun";

console.log("Starting ElectroBun Main Process...");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Start a lightweight local native server on port 3005 to process Kafka requests
const server = serve({
  port: 3005,
  async fetch(req) {
    const url = new URL(req.url);
    console.log(`[Bun Server] Request: ${req.method} ${url.pathname}`);
    
    // Handle CORS preflight options request
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }
    
    // Intercept Kafka connection validation
    if (url.pathname === '/api/kafka/test-connection' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { createKafkaClient } = await import('../utils/kafka-helper');
        const kafka = createKafkaClient(body);
        const admin = kafka.admin();
        await admin.connect();
        const clusterInfo = await admin.describeCluster();
        await admin.disconnect();
        
        return Response.json({
          success: true,
          clusterId: clusterInfo.clusterId,
          controller: clusterInfo.controller,
          brokers: clusterInfo.brokers.length,
        }, {
          headers: corsHeaders
        });
      } catch (err: any) {
        return Response.json({ success: false, error: err.message || 'Connection failed' }, {
          status: 400,
          headers: corsHeaders
        });
      }
    }
    
    // Intercept Kafka retrieve topics lists
    if (url.pathname === '/api/kafka/topics' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { createKafkaClient } = await import('../utils/kafka-helper');
        const kafka = createKafkaClient(body);
        const admin = kafka.admin();
        await admin.connect();
        const metadata = await admin.fetchTopicMetadata();
        await admin.disconnect();
        
        const topics = metadata.topics.map((t) => ({
          name: t.name,
          partitionCount: t.partitions.length,
          isInternal: t.name.startsWith('_') || t.name.startsWith('__'),
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        return Response.json({ success: true, topics }, {
          headers: corsHeaders
        });
      } catch (err: any) {
        return Response.json({ success: false, error: err.message || 'Failed to fetch topics' }, {
          status: 400,
          headers: corsHeaders
        });
      }
    }
    
    // Intercept live SSE telemetry log stream
    if (url.pathname === '/api/kafka/stream' && req.method === 'GET') {
      const encodedConfig = url.searchParams.get('config');
      const topicsStr = url.searchParams.get('topics');
      const fromBeginning = url.searchParams.get('fromBeginning') === 'true';
      if (!encodedConfig || !topicsStr) {
        return new Response('Missing connection config or streaming topics.', { status: 400, headers: corsHeaders });
      }
      
      let config;
      try {
        const rawJson = Buffer.from(encodedConfig, 'base64').toString('utf-8');
        config = JSON.parse(rawJson);
      } catch (err) {
        return new Response('Invalid connection configuration encoding.', { status: 400, headers: corsHeaders });
      }
      const topics = topicsStr.split(',').map((t) => t.trim()).filter(Boolean);
      
      const { createKafkaClient } = await import('../utils/kafka-helper');
      const kafka = createKafkaClient(config);
      const ephemeralGroupId = `kafka-stream-ui-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const consumer = kafka.consumer({
        groupId: ephemeralGroupId,
        sessionTimeout: 10000,
        heartbeatInterval: 3000,
      });
      await consumer.connect();
      for (const topic of topics) {
        await consumer.subscribe({ topic, fromBeginning });
      }
      
      let isClosed = false;
      let keepAliveInterval: any;
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, data: any) => {
            if (isClosed) return;
            try {
              controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
            } catch (e) {}
          };
          
          keepAliveInterval = setInterval(() => {
            sendEvent('ping', { time: Date.now() });
          }, 15000);
          
          await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
              if (isClosed) return;
              sendEvent('message', {
                topic,
                partition,
                offset: message.offset.toString(),
                timestamp: message.timestamp,
                key: message.key ? message.key.toString('utf-8') : null,
                value: message.value ? message.value.toString('utf-8') : null,
              });
            },
          });
        },
        async cancel() {
          isClosed = true;
          clearInterval(keepAliveInterval);
          try {
            await consumer.stop();
            await consumer.disconnect();
          } catch (e) {}
        }
      });
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          ...corsHeaders,
        },
      });
    }
    
    return new Response("Not found", { status: 404, headers: corsHeaders });
  }
});

console.log(`Bun native Kafka API proxy listening on http://localhost:${server.port}`);

// Initialize native system window pointing directly to ElectroBun local views protocol
const win = new BrowserWindow({
  title: "Kafka Stream Console",
  url: "views://main/index.html",
  frame: {
    width: 1280,
    height: 800,
  },
});

win.webview.on("dom-ready", () => {
  console.log("Application main view is DOM-ready inside Native WebView served from views://main.");
});
