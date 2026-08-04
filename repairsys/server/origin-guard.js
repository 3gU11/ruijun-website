const stateChangingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function originGuardDecision({ method, origin, allowedOrigins }) {
  const requestOrigin = String(origin || '').trim();

  if (requestOrigin && !allowedOrigins.has(requestOrigin)) {
    return { allowed: false, reason: 'untrusted_origin' };
  }

  if (stateChangingMethods.has(String(method || '').toUpperCase()) && !requestOrigin) {
    return { allowed: false, reason: 'missing_origin' };
  }

  return { allowed: true };
}

export function requireTrustedOrigin(allowedOrigins) {
  return (req, res, next) => {
    const decision = originGuardDecision({
      method: req.method,
      origin: req.get('Origin'),
      allowedOrigins
    });
    if (decision.allowed) return next();

    const message = decision.reason === 'missing_origin'
      ? '写入请求必须携带受信任的 Origin'
      : '请求来源不在允许列表中';
    return res.status(403).json({ message });
  };
}
