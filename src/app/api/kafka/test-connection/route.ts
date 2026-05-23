import { NextRequest, NextResponse } from 'next/server';
import { createKafkaClient } from '@/utils/kafka-helper';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kafka = createKafkaClient(body);
    const admin = kafka.admin();

    // Attempt connection and retrieve basic cluster info to verify status
    await admin.connect();
    const clusterInfo = await admin.describeCluster();
    await admin.disconnect();

    return NextResponse.json({
      success: true,
      clusterId: clusterInfo.clusterId,
      controller: clusterInfo.controller,
      brokers: clusterInfo.brokers.length,
    });
  } catch (error: any) {
    console.error('Kafka connection test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to establish connection to Kafka brokers.',
      },
      { status: 400 }
    );
  }
}
