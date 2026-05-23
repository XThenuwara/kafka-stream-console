import { Kafka, SASLOptions } from 'kafkajs';

export interface KafkaConfig {
  bootstrapServers: string;
  clientId?: string;
  ssl: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}

/**
 * Creates a stateless Kafka JS client instance based on the provided configuration payload.
 */
export function createKafkaClient(config: KafkaConfig) {
  if (!config.bootstrapServers) {
    throw new Error('Bootstrap servers are required.');
  }

  const brokers = config.bootstrapServers.split(',').map((s) => s.trim());

  let saslOptions: SASLOptions | undefined = undefined;
  if (config.sasl && config.sasl.username && config.sasl.password) {
    saslOptions = {
      mechanism: config.sasl.mechanism || 'plain',
      username: config.sasl.username,
      password: config.sasl.password,
    };
  }

  return new Kafka({
    clientId: config.clientId || 'kafka-stream-ui-client',
    brokers,
    ssl: config.ssl,
    sasl: saslOptions,
    connectionTimeout: 5000,
    requestTimeout: 10000,
  });
}
