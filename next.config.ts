import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/admin/setting',
        destination: '/admin/thiet-lap',
        permanent: false,
      },
      {
        source: '/admin/cai-dat',
        destination: '/admin/thiet-lap',
        permanent: false,
      },
      {
        source: '/admin/hop-dong',
        destination: '/admin/nhat-ky-hop-dong',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
