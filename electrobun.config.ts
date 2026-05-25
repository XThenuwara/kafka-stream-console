export default {
  app: {
    name: "Kafka Stream Console",
    identifier: "com.kafka.stream.ui",
    version: "1.0.0",
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    views: {
      main: {
        entrypoint: "src/desktop.html",
      },
    },
    copy: {
      "out": "views/main",
    },
  },
};
