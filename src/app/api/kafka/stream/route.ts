import { NextRequest } from 'next/server';
import { createKafkaClient } from '@/utils/kafka-helper';
import { Consumer } from 'kafkajs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const encodedConfig = searchParams.get('config');
  const topicsStr = searchParams.get('topics');
  const fromBeginning = searchParams.get('fromBeginning') === 'true';

  if (!encodedConfig || !topicsStr) {
    return new Response('Missing connection config or streaming topics.', { status: 400 });
  }

  let config;
  try {
    const rawJson = Buffer.from(encodedConfig, 'base64').toString('utf-8');
    config = JSON.parse(rawJson);
  } catch (err) {
    return new Response('Invalid connection configuration encoding.', { status: 400 });
  }

  const topics = topicsStr.split(',').map((t) => t.trim()).filter(Boolean);
  if (topics.length === 0) {
    return new Response('No valid streaming topics specified.', { status: 400 });
  }

  let consumer: Consumer | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        if (isClosed) return;
        try {
          controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch (e) {
          // Stream might have closed during enqueue
        }
      };

      try {
        const kafka = createKafkaClient(config);
        
        // Generate a unique client-specific ephemeral group ID to read live updates
        const ephemeralGroupId = `kafka-stream-ui-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        
        consumer = kafka.consumer({
          groupId: ephemeralGroupId,
          sessionTimeout: 10000,
          heartbeatInterval: 3000,
        });

        await consumer.connect();

        // Subscribe to all requested topics
        for (const topic of topics) {
          await consumer.subscribe({ topic, fromBeginning });
        }

        // Keep connection alive notification
        const keepAliveInterval = setInterval(() => {
          sendEvent('ping', { time: Date.now() });
        }, 15000);

        // Start consuming messages
        await consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            if (isClosed) return;
            
            const payload = {
              topic,
              partition,
              offset: message.offset,
              timestamp: message.timestamp,
              key: message.key ? message.key.toString('utf-8') : null,
              value: message.value ? message.value.toString('utf-8') : null,
            };

            sendEvent('message', payload);
          },
        });

        // Event listener for client abort / disconnect
        req.signal.addEventListener('abort', async () => {
          if (isClosed) return;
          isClosed = true;
          clearInterval(keepAliveInterval);
          
          console.log(`SSE Client disconnected, tearing down Kafka consumer for group ${ephemeralGroupId}`);
          try {
            if (consumer) {
              await consumer.stop();
              await consumer.disconnect();
            }
          } catch (disconnectErr) {
            console.error('Error disconnecting ephemeral Kafka consumer:', disconnectErr);
          } finally {
            try {
              controller.close();
            } catch (e) {}
          }
        });

      } catch (err: any) {
        console.error('Error starting live Kafka consumer stream:', err);
        sendEvent('error', { message: err.message || 'Failed to initialize Kafka consumer stream.' });
        isClosed = true;
        try {
          if (consumer) {
            await consumer.disconnect();
          }
        } catch (e) {}
        try {
          controller.close();
        } catch (e) {}
      }
    },
    cancel() {
      isClosed = true;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
