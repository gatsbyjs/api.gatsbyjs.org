import winston from 'winston';

const addLabel = winston.format(info => {
  // Add the label to the message.
  info.message = `[${info.label}] ${info.message}`;

  // Remove the label so it doesn’t get logged as JSON.
  delete info.label;

  return info;
});

const removeEmptyMeta = winston.format(info => {
  // Remove the meta prop since splat was already applied.
  if (info.meta && info.meta.length < 1) {
    delete info.meta;
  }

  return info;
});

export default label =>
  winston.createLogger({
    level: process.env.APP_LOGLEVEL,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.label({ label }),
      winston.format.splat(),
      addLabel(),
      removeEmptyMeta(),
      winston.format.simple()
    ),
    transports: [
      new winston.transports.Console({
        silent: process.env.NODE_ENV !== 'development'
      })
    ]
  });
