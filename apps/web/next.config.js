/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  images: { domains: ['hazardwatch-assets.s3.amazonaws.com'] },
};
module.exports = config;
