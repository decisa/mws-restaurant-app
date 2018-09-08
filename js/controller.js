
// if (navigator.serviceWorker) {
//     window.addEventListener('load', function() {
//         navigator.serviceWorker.register('/sw.js')
//         .then(function(registration) {
//             if (!navigator.serviceWorker.controller) {
//                 console.log(`clean install sw registration successful ${registration.scope}`);
//                 return;
//             }

//             if (registration.waiting) {
//                 // console.log('service worker is waiting already');
//                 return;
//             }
//             if (registration.installing) {
//                 // console.log('service worker is installing ');
//                 registration.installing.addEventListener('statechange', function(event) {
//                     if (event.target.state == 'installed') {
//                         console.log('service worker update is ready');
//                     }
//                 });
//                 return;
//             }

//             registration.addEventListener('updatefound', function() {
//                 registration.installing.addEventListener('statechange', function(event) {
//                     if (event.target.state == 'installed') {
//                         console.log('service worker update is ready v2');
//                     }
//                 });                   
//             });
//         })
//         .catch(function(err) {
//             console.log(`service worker registration is not successful: ${err}`);
//         });
//     });
// }