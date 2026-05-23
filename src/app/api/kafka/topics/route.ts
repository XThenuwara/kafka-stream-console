import { NextRequest, NextResponse } from 'next/server';
import { createKafkaClient } from '@/utils/kafka-helper';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kafka = createKafkaClient(body);
    const admin = kafka.admin();

    await admin.connect();
    
    // Fetch all topics and their partition configurations
    const metadata = await admin.fetchTopicMetadata();
    await admin.disconnect();

    const topics = metadata.topics.map((t) => ({
      name: t.name,
      partitionCount: t.partitions.length,
      isInternal: t.name.startsWith('_') || t.name.startsWith('__'),
    })).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      topics,
    });
  } catch (error: any) {
    console.error('Kafka topics retrieval failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to list Kafka topics.',
      },
      { status: 400 }
    );
  }
}
