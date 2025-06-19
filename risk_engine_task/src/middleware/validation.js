const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }
    next();
  };
};

const riskEvaluationSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).uppercase().required(),
  ip: Joi.string().ip().required(),
  deviceFingerprint: Joi.string().min(1).required(),
  email: Joi.string().email().required()
});

module.exports = {
  validateRequest,
  riskEvaluationSchema
}; 