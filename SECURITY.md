# Security Policy

## Supported Versions

This project is actively maintained and uses the latest stable versions of Next.js and React with all critical security patches applied.

| Package | Version | Security Status |
|---------|---------|----------------|
| Next.js | 16.0.7 | ✅ Patched (CVE-2025-66478) |
| React | 19.2.1 | ✅ Patched (CVE-2025-55182) |
| React-DOM | 19.2.1 | ✅ Patched (CVE-2025-55182) |

## CVE-2025-55182 / CVE-2025-66478 Security Advisory

### Overview

A critical remote code execution (RCE) vulnerability was discovered in React Server Components, affecting React 19.x and frameworks using it, including Next.js 15.x and 16.x with the App Router.

- **CVE-2025-55182**: React Server Components RCE vulnerability
- **CVE-2025-66478**: Next.js specific tracking for the same vulnerability
- **Severity**: Critical (CVSS 10.0)
- **Discovery Date**: December 3, 2025
- **Status**: ✅ **PATCHED** in this repository

### Vulnerability Details

The vulnerability exists in React Server Components implementation where specially crafted HTTP requests to Server Function endpoints could lead to unsafe deserialization, allowing remote code execution. The vulnerability affected:

- React versions: 19.0.0, 19.1.0, 19.1.1, and 19.2.0 (19.2.0 was the last vulnerable version)
- Next.js versions: ≥14.3.0-canary.77, ≥15.x, and ≥16.x (prior to patches)
- React packages: `react-server-dom-parcel`, `react-server-dom-webpack`, `react-server-dom-turbopack`

### Patched Versions

This repository uses the following patched versions:

- **React 19.2.1** - Fixes CVE-2025-55182
- **Next.js 16.0.7** - Fixes CVE-2025-66478

Other patched versions include:
- React: 19.0.1, 19.1.2, 19.2.1
- Next.js: 15.0.5, 15.1.9, 15.2.6, 15.3.6, 15.4.8, 15.5.7, 15.6.0-canary.58, 16.0.7

### Verification

To verify your deployment is secure, check your package.json dependencies:

```bash
# Check installed versions
pnpm list next react react-dom

# Expected output:
# next 16.0.7 (or higher)
# react 19.2.1 (or higher)
# react-dom 19.2.1 (or higher)
```

### Mitigation

✅ **This repository is already protected** with the patched versions.

If you're deploying this application:

1. **Always use the latest dependencies** from package.json
2. **Run `pnpm install`** to ensure patched versions are installed
3. **Redeploy your application** if you're using an older deployment
4. **Do not downgrade** React or Next.js versions below the patched releases

### Additional Security Measures

For production deployments:

1. **Use Vercel or similar platforms**: Platforms like Vercel have deployed WAF rules to automatically protect hosted applications
2. **Keep dependencies updated**: Regularly run `pnpm update` to get the latest security patches
3. **Monitor security advisories**: Subscribe to [Next.js security advisories](https://github.com/vercel/next.js/security/advisories) and [React security updates](https://react.dev/blog)
4. **Use environment variable validation**: Ensure all required environment variables are properly configured

## Reporting a Vulnerability

If you discover a security vulnerability in this project:

1. **Do not open a public issue** - This could put users at risk
2. **Contact the repository owner** directly through GitHub
3. **Provide detailed information**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes

We take security seriously and will respond to verified reports promptly.

## Security Best Practices

When deploying or contributing to this project:

- ✅ Use environment variables for sensitive data (API keys, database credentials)
- ✅ Never commit `.env.local` or similar files containing secrets
- ✅ Enable HTTPS for all production deployments
- ✅ Keep all dependencies up to date with `pnpm update`
- ✅ Review and follow [OWASP Top 10](https://owasp.org/www-project-top-ten/) guidelines
- ✅ Use strong authentication practices (Auth.js configuration)
- ✅ Implement rate limiting for API endpoints
- ✅ Sanitize user inputs and validate data

## References

- [Next.js Security Advisory (CVE-2025-66478)](https://nextjs.org/blog/CVE-2025-66478)
- [React Security Advisory (CVE-2025-55182)](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)
- [Vercel Security Summary](https://vercel.com/changelog/cve-2025-55182)
- [GitHub Advisory Database](https://github.com/advisories)
- [CVE-2025-55182 Details](https://www.cve.org/CVERecord?id=CVE-2025-55182)

---

**Last Updated**: December 2025  
**Security Status**: ✅ All critical vulnerabilities patched
