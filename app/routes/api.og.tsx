import type { LoaderFunctionArgs } from '@remix-run/node'
import invariant from 'tiny-invariant'
import { ImageResponse } from '@vercel/og'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const title = url.searchParams.get('title')
  const extra = url.searchParams.get('extra')
  const description = url.searchParams.get('description')
  const src = new URL('/img/home-bg.jpg', request.url)
  invariant(title, 'No title provided')

  return new ImageResponse(
    (
      <div
        style={{
          color: 'black',
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <img
          src={src.href}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <div style={{ display: 'flex', width: '100%', padding: '2rem 4rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <h1 style={{ fontSize: '6rem', fontWeight: 'bold' }}>{title}</h1>
              {extra && (<span style={{ fontSize: '4rem' }}>{extra}</span>)}
            </div>
            {description && (<h2 style={{ color: '#999', fontSize: '3rem' }}>{description}</h2>)}
            <p style={{ marginTop: 'auto', fontSize: '2rem' }}>pyoven.org</p>
          </div>
          <svg width="280" height="280" viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M211.488 176C202.164 183.154 157.648 181.663 139.902 181.663C114.938 181.663 77.9414 183.452 69.2188 176L62 177.788C66.8125 185.837 77.8329 207 84.5586 207H139.902H193.742C201.202 207 211.689 187.526 216 177.788L211.488 176Z" fill="#4584B6" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M138.291 99C153.106 99 175.784 101.393 194.53 116.352C213.277 131.311 219.022 145.971 220.231 149.262C223.053 149.362 228.758 151.117 229 157.34C229 163.025 225.674 167.811 218.72 167.811C213.156 167.811 209.145 165.617 207.834 164.52C204.811 167.014 196.466 172 187.274 172H91.7263C82.5345 172 74.1892 167.014 71.1655 164.52C69.8553 165.617 65.8439 167.811 60.2804 167.811C53.326 167.811 50 163.025 50 157.34C50.2419 151.117 55.9465 149.362 58.7686 149.262C59.978 145.971 65.723 131.311 84.4696 116.352C103.216 101.393 123.475 99 138.291 99ZM134.965 122.037C138.805 122.037 141.919 118.956 141.919 115.156C141.919 111.355 138.805 108.275 134.965 108.275C131.124 108.275 128.01 111.355 128.01 115.156C128.01 118.956 131.124 122.037 134.965 122.037ZM178.203 120.541C178.203 124.341 175.089 127.422 171.248 127.422C167.408 127.422 164.294 124.341 164.294 120.541C164.294 116.741 167.408 113.66 171.248 113.66C175.089 113.66 178.203 116.741 178.203 120.541ZM111.682 125.328C111.682 129.128 108.569 132.209 104.728 132.209C100.887 132.209 97.7736 129.128 97.7736 125.328C97.7736 121.528 100.887 118.447 104.728 118.447C108.569 118.447 111.682 121.528 111.682 125.328ZM130.731 144.176C134.572 144.176 137.686 141.095 137.686 137.295C137.686 133.495 134.572 130.414 130.731 130.414C126.891 130.414 123.777 133.495 123.777 137.295C123.777 141.095 126.891 144.176 130.731 144.176ZM130.429 159.434C130.429 163.235 127.315 166.316 123.475 166.316C119.634 166.316 116.52 163.235 116.52 159.434C116.52 155.634 119.634 152.553 123.475 152.553C127.315 152.553 130.429 155.634 130.429 159.434ZM169.132 140.885C169.132 144.686 166.018 147.766 162.177 147.766C158.337 147.766 155.223 144.686 155.223 140.885C155.223 137.085 158.337 134.004 162.177 134.004C166.018 134.004 169.132 137.085 169.132 140.885ZM104.728 156.143C108.569 156.143 111.682 153.063 111.682 149.262C111.682 145.462 108.569 142.381 104.728 142.381C100.887 142.381 97.7736 145.462 97.7736 149.262C97.7736 153.063 100.887 156.143 104.728 156.143ZM195.74 142.68C195.74 146.481 192.626 149.561 188.785 149.561C184.945 149.561 181.831 146.481 181.831 142.68C181.831 138.88 184.945 135.799 188.785 135.799C192.626 135.799 195.74 138.88 195.74 142.68ZM155.525 166.316C159.366 166.316 162.48 163.235 162.48 159.434C162.48 155.634 159.366 152.553 155.525 152.553C151.685 152.553 148.571 155.634 148.571 159.434C148.571 163.235 151.685 166.316 155.525 166.316ZM86.2838 145.074C86.2838 148.874 83.1702 151.955 79.3294 151.955C75.4886 151.955 72.375 148.874 72.375 145.074C72.375 141.273 75.4886 138.193 79.3294 138.193C83.1702 138.193 86.2838 141.273 86.2838 145.074Z" fill="#FFDE57" />
            <path d="M201.45 75.6584C190.186 63.4245 168.17 46 139.872 46C108.384 46 84.6487 66.4409 75.762 77.7442C75.1722 78.4944 74.2838 78.9473 73.3295 78.9473H48.8356C27.3381 78.9473 20.3891 95.3609 19.0325 104.767C19.0099 104.924 19.0019 105.078 19.0056 105.237L21.9911 232.071C22.0295 233.699 23.3609 235 24.9903 235H258C259.657 235 261 233.674 261 232.017V105.268C261 105.068 260.98 104.897 260.939 104.701C256.744 84.7413 239.034 76.6486 231.929 76.6486H203.687C202.833 76.6486 202.028 76.2865 201.45 75.6584Z" stroke="#646464" stroke-width="18" />
          </svg>
        </div>

      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}