self.addEventListener('install',evt =>{
	console.log('Service worker has been installed successfully');
})

self.addEventListener('activate',evt =>{
	console.log('Service worker has been activated successfully');
})


self.addEventListener('fetch',evt => {
	console.log('fetch event');
})