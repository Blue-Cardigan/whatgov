import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		screens: {
  			lg: '1280px',
  			xl: '1536px',
			xs: '300px',
			'firefox': { raw: '(-moz-box-flex: 0)' }
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
			'spin-slow': 'spin 3s linear infinite',
  		},
  		typography: {
  			DEFAULT: {
  				css: {
  					maxWidth: '100%',
  					a: {
  						color: 'hsl(var(--primary))',
  						textDecoration: 'underline',
  						'&:hover': {
  							color: 'hsl(var(--primary-foreground))',
  							backgroundColor: 'hsl(var(--primary))',
  						},
  					},
  				}
  			},
  			dark: {
  				css: {
  					color: 'hsl(var(--foreground))',
  					'[class~="lead"]': {
  						color: 'hsl(var(--muted-foreground))',
  					},
  					strong: {
  						color: 'hsl(var(--foreground))',
  					},
  					'ol > li::marker': {
  						color: 'hsl(var(--muted-foreground))',
  					},
  					'ul > li::marker': {
  						color: 'hsl(var(--muted-foreground))',
  					},
  					hr: {
  						borderColor: 'hsl(var(--border))',
  					},
  					blockquote: {
  						color: 'hsl(var(--foreground))',
  						borderLeftColor: 'hsl(var(--border))',
  					},
  					h1: {
  						color: 'hsl(var(--foreground))',
  					},
  					h2: {
  						color: 'hsl(var(--foreground))',
  					},
  					h3: {
  						color: 'hsl(var(--foreground))',
  					},
  					h4: {
  						color: 'hsl(var(--foreground))',
  					},
  					'figure figcaption': {
  						color: 'hsl(var(--muted-foreground))',
  					},
  					code: {
  						color: 'hsl(var(--foreground))',
  					},
  					'a code': {
  						color: 'hsl(var(--foreground))',
  					},
  					pre: {
  						color: 'hsl(var(--foreground))',
  						backgroundColor: 'hsl(var(--muted))',
  					},
  					thead: {
  						color: 'hsl(var(--foreground))',
  						borderBottomColor: 'hsl(var(--border))',
  					},
  					'tbody tr': {
  						borderBottomColor: 'hsl(var(--border))',
  					},
  					a: {
  						color: 'hsl(var(--primary-foreground))',
  						textDecoration: 'underline',
  						'&:hover': {
  							color: 'hsl(var(--primary))',
  							backgroundColor: 'hsl(var(--primary-foreground))',
  						},
  					},
  				},
  			},
  		},
  	}
  },
  plugins: [
	require("tailwindcss-animate"),
	require('@tailwindcss/typography')({
		className: 'prose',
		dark: true,
	}),
],
} satisfies Config;
