function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('✅ Service Worker registered:', reg.scope);
                swRegistration = reg;
                updateStatus();
                
                // Request background sync permission
                if ('periodicSync' in reg) {
                    reg.periodicSync.register('check-tasks', {
                        minInterval: 60000 // 1 minute
                    }).catch(err => console.log('Periodic sync failed:', err));
                }
                
                // Listen for messages from SW
                navigator.serviceWorker.addEventListener('message', event => {
                    if (event.data?.type === 'TASK_DUE') {
                        const schedules = getSchedules();
                        const task = schedules.find(t => t.id === event.data.taskId);
                        if (task) triggerNotification(task);
                    }
                });
            })
            .catch(err => {
                console.error('❌ SW registration failed:', err);
            });
    }
}
